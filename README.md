# Contract Parser & Billing Configurator

A full-stack LLM-powered system that converts unstructured B2B sales contracts (PDF/text) into structured billing configurations.

Extracts payment terms, billing frequency, usage tiers, renewal clauses, and late fees with confidence scoring and human review workflows. Outputs validated JSON or CSV configurations ready for downstream billing systems.

---

## Features

- PDF & text contract ingestion  
- Structured billing term extraction  
- Field-level confidence scoring  
- Inline review & editing interface  
- JSON / CSV export  
- Audit log of changes  

---

## Tech Stack

**Frontend:** Next.js, TypeScript  
**Backend:** FastAPI, Python, OpenAI API  
**Database:** PostgreSQL  
**Document Parsing:** PyMuPDF / pdfplumber  

---

## Architecture

1. Upload contract  
2. Extract & normalize text  
3. Generate structured billing fields  
4. Review + edit  
5. Export configuration  

---

## Example Output

```json
{
  "billing_frequency": "Monthly",
  "payment_terms": "Net 30",
  "renewal": "Annual auto-renewal",
  "late_fee": "1.5% per month"
}