# Contracts API router

import os
import uuid
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Query
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Contract, AuditLog, ContractStatus
from services import extract_text_from_file, extract_billing_config, export_as_json, export_as_csv

router = APIRouter(prefix="/api/contracts", tags=["contracts"])
logger = logging.getLogger(__name__)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


# Pydantic schemas

class FieldUpdate(BaseModel):
    field: str
    value: object
    reason: Optional[str] = None


class ContractSummary(BaseModel):
    id: str
    filename: str
    status: str
    created_at: datetime
    updated_at: datetime


# Background task

# Background task: extract text → run LLM → save results
async def process_contract(contract_id: str, file_path: str, db: Session):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        return

    try:
        # Update status to processing
        contract.status = ContractStatus.PROCESSING
        db.commit()

        # Extract text from PDF/txt
        logger.info(f"Extracting text from {file_path}")
        raw_text = extract_text_from_file(file_path)
        
        if not raw_text or len(raw_text.strip()) < 50:
            raise ValueError("Could not extract meaningful text from the file")

        contract.raw_text = raw_text
        db.commit()

        # Run LLM extraction
        logger.info(f"Running LLM extraction for contract {contract_id}")
        billing_config = await extract_billing_config(raw_text)

        # Save results
        contract.billing_config = billing_config
        contract.status = ContractStatus.COMPLETED
        db.commit()

        # Write initial extraction audit log
        audit = AuditLog(
            contract_id=contract_id,
            field_name="billing_config",
            old_value=None,
            new_value={"extracted": True, "fields": list(billing_config.keys())},
            action="extracted",
            reason="Automatic LLM extraction completed",
        )
        db.add(audit)
        db.commit()

        logger.info(f"Contract {contract_id} processed successfully")

    except Exception as e:
        logger.error(f"Failed to process contract {contract_id}: {e}")
        contract.status = ContractStatus.FAILED
        contract.error_message = str(e)
        db.commit()


# Endpoints

# Upload a contract PDF or text file for parsing
@router.post("/upload")
async def upload_contract(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # Validate file type
    allowed_types = {"application/pdf", "text/plain"}
    allowed_extensions = {".pdf", ".txt", ".text"}
    
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(400, f"File type not supported. Use PDF or plain text.")

    # Read file with size limit
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(400, f"File too large. Maximum size is 10MB.")

    # Save to disk
    file_id = str(uuid.uuid4())
    saved_filename = f"{file_id}{file_ext}"
    file_path = UPLOAD_DIR / saved_filename
    
    with open(file_path, "wb") as f:
        f.write(content)

    # Create DB record
    contract = Contract(
        id=file_id,
        filename=saved_filename,
        original_filename=file.filename,
        file_path=str(file_path),
        status=ContractStatus.PENDING,
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)

    # Queue background processing
    background_tasks.add_task(process_contract, file_id, str(file_path), db)

    return {"contract_id": file_id, "status": "processing"}


# List all contracts with pagination
@router.get("")
def list_contracts(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    contracts = db.query(Contract).order_by(Contract.created_at.desc()).offset(skip).limit(limit).all()
    total = db.query(Contract).count()
    
    return {
        "contracts": [
            {
                "id": str(c.id),
                "filename": c.original_filename,
                "status": c.status.value,
                "created_at": c.created_at,
                "updated_at": c.updated_at,
            }
            for c in contracts
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


# Get a contract with its billing config and audit log
@router.get("/{contract_id}")
def get_contract(contract_id: str, db: Session = Depends(get_db)):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(404, "Contract not found")

    audit_logs = db.query(AuditLog).filter(
        AuditLog.contract_id == contract_id
    ).order_by(AuditLog.created_at.desc()).all()

    return {
        "id": str(contract.id),
        "filename": contract.original_filename,
        "status": contract.status.value,
        "raw_text": contract.raw_text,
        "billing_config": contract.billing_config,
        "error_message": contract.error_message,
        "created_at": contract.created_at,
        "updated_at": contract.updated_at,
        "audit_log": [
            {
                "id": str(log.id),
                "field_name": log.field_name,
                "old_value": log.old_value,
                "new_value": log.new_value,
                "reason": log.reason,
                "action": log.action,
                "created_at": log.created_at,
            }
            for log in audit_logs
        ],
    }


# Update a single extracted field and log the change
@router.patch("/{contract_id}/fields")
def update_field(
    contract_id: str,
    update: FieldUpdate,
    db: Session = Depends(get_db),
):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(404, "Contract not found")
    
    if contract.status != ContractStatus.COMPLETED:
        raise HTTPException(400, "Contract must be fully processed before editing")

    billing_config = contract.billing_config or {}
    
    # Get old value for audit log
    old_value = billing_config.get(update.field)
    
    # Navigate nested field path (e.g. "payment_schedule.value")
    parts = update.field.split(".")
    if len(parts) == 1:
        if update.field not in billing_config:
            raise HTTPException(400, f"Field '{update.field}' not found")
        billing_config[update.field] = update.value
    elif len(parts) == 2:
        parent, child = parts
        if parent not in billing_config:
            raise HTTPException(400, f"Field '{parent}' not found")
        billing_config[parent][child] = update.value
    else:
        raise HTTPException(400, "Nested field depth > 2 not supported")

    # Mark manually reviewed
    if len(parts) == 2 and parts[1] == "value" and parts[0] in billing_config:
        billing_config[parts[0]]["manually_reviewed"] = True

    contract.billing_config = billing_config
    contract.updated_at = datetime.utcnow()
    
    # Force SQLAlchemy to detect JSON mutation
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(contract, "billing_config")
    db.commit()

    # Audit log
    audit = AuditLog(
        contract_id=contract_id,
        field_name=update.field,
        old_value=old_value,
        new_value=update.value,
        reason=update.reason,
        action="edited",
    )
    db.add(audit)
    db.commit()

    return {"success": True, "field": update.field, "new_value": update.value}


# Export the billing config as JSON or CSV
@router.get("/{contract_id}/export")
def export_contract(
    contract_id: str,
    format: str = Query("json", regex="^(json|csv)$"),
    db: Session = Depends(get_db),
):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(404, "Contract not found")
    
    if contract.status != ContractStatus.COMPLETED:
        raise HTTPException(400, "Contract must be processed before export")

    # Audit the export
    audit = AuditLog(
        contract_id=contract_id,
        field_name="billing_config",
        old_value=None,
        new_value={"exported_format": format},
        action="exported",
    )
    db.add(audit)
    db.commit()

    if format == "json":
        content = export_as_json(contract.billing_config, contract_id)
        return Response(
            content=content,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=contract_{contract_id[:8]}_billing.json"}
        )
    else:
        content = export_as_csv(contract.billing_config, contract_id)
        return Response(
            content=content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=contract_{contract_id[:8]}_billing.csv"}
        )

 
# Delete a contract and its associated data
@router.delete("/{contract_id}")
def delete_contract(contract_id: str, db: Session = Depends(get_db)):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(404, "Contract not found")
    
    # Delete file from disk
    if contract.file_path and os.path.exists(contract.file_path):
        os.remove(contract.file_path)
    
    # Cascade deletes audit logs via ORM
    db.query(AuditLog).filter(AuditLog.contract_id == contract_id).delete()
    db.delete(contract)
    db.commit()
    
    return {"success": True}