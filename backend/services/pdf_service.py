# PDF and text extraction service using pdfplumber with PyMuPDF fallback

import io
import logging
from pathlib import Path
from typing import Optional

import pdfplumber
import fitz

logger = logging.getLogger(__name__)

#Extract text from a PDF or plain text file
#Uses pdfplumber first, then falls back to PyMuPDF for scanned/complex PDFs
def extract_text_from_file(file_path: str) -> str:
    path = Path(file_path)

    if path.suffix.lower() == ".pdf":
        text = _extract_with_pdfplumber(file_path)
        if not text or len(text.strip()) < 100:
            logger.info("pdfplumber returned insufficient text, trying PyMuPDF")
            text = _extract_with_pymupdf(file_path)
        return text
    
    else:
        #Plain text or .txt file
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
        

#Extract text using pdfplumber
def _extract_with_pdfplumber(file_path: str) -> str:
    try:
        full_text = []
        with pdfplumber.open(file_path) as pdf:
            for page_num, page in enumerate(pdf.pages, 1):
                text = page.extract_text()
                if text:
                    full_text.append(f"[Page {page_num}]\n{text}")

                # try to extract tables as structured text
                tables = page.extract_tables()
                for table in tables:
                    if table:
                        table_text = _table_to_text(table)
                        if table_text:
                            full_text.append(f"[Table on Page {page_num}\n{table_text}]")

        return "\n\n".join(full_text)
    
    except Exception as e:
        logger.error(f"extraction using pdfplumber failed: {e}")
        return ""
    



def _extract_with_pymupdf(file_path: str) -> str:
    try:
        doc = fitz.open(file_path)
        full_text = []

        for page_num, page in enumerate(doc, 1):
            text = page.get_text("text")
            if text.strip():
                full_text.append(f"[Page {page_num}]\n{text}")

        doc.close()
        return "\n\n".join(full_text)
    
    except Exception as e:
        logger.error(f"extraction with PyMUPDF failed: {e}")
        return ""
    


#Convert a pdfplumber table to readable text
def _table_to_text(table: list) -> str:
    rows = []
    for row in table:
        if row:
            cleaned = [str(cell).strip() if cell else "" for cell in row]
            rows.append(" | ".join(cleaned))
        return "\n".join(rows)