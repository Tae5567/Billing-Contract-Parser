# SQLAlchemy models for the contract parser

from datetime import datetime
from sqlalchemy import (
    Column, String, Text, DateTime, Float, JSON, 
    ForeignKey, Enum as SAEnum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base
import uuid
import enum


class ContractStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    raw_text = Column(Text, nullable=True)
    status = Column(SAEnum(ContractStatus), default=ContractStatus.PENDING)
    billing_config = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    audit_logs = relationship("AuditLog", back_populates="contract", 
                               order_by="AuditLog.created_at.desc()")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    field_name = Column(String(100), nullable=False)
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    reason = Column(Text, nullable=True)
    action = Column(String(50), nullable=False)  # "extracted", "edited", "exported"
    created_at = Column(DateTime, default=datetime.utcnow)

    contract = relationship("Contract", back_populates="audit_logs")