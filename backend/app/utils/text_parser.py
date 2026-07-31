import re
from typing import List, Optional, Tuple
from app.schemas import Lecture

def normalize_ocr_text(text: str) -> str:
    """Fixes common Tesseract OCR errors and normalizes spacing."""
    if not text:
        return ""
    
    replacements = {
        r"\b0S\b": "OS",
        r"\bCornp\b": "Comp",
        r"\bOE-III\b": "OE III",
        r"\bOE - III\b": "OE III",
    }
    
    for pattern, replacement in replacements.items():
        text = re.sub(pattern, replacement, text)
        
    # Ignore and remove classroom numbers (e.g., C315, A303, A017)
    text = re.sub(r"\b[A-C]\d{3}\b|\bA017\b", "", text)
    
    # Normalize multiple spaces and newlines
    text = re.sub(r"\s+", " ", text).strip()
    return text

def parse_time_slot(text: str) -> Tuple[Optional[str], Optional[str]]:
    """Converts '12.10pm-1.05pm' to 24h format ('12:10', '13:05')."""
    time_pattern = r"(\d{1,2})[\.\:](\d{2})\s*(am|pm)?\s*-\s*(\d{1,2})[\.\:](\d{2})\s*(am|pm)?"
    match = re.search(time_pattern, text.lower())
    
    if not match:
        return None, None
        
    h1, m1, p1, h2, m2, p2 = match.groups()
    
    def to_24h(h: str, m: str, p: str) -> str:
        hour = int(h)
        if p == 'pm' and hour != 12: hour += 12
        if p == 'am' and hour == 12: hour = 0
        return f"{hour:02d}:{m}"
        
    p1 = p1 or ('pm' if (p2 == 'pm' and int(h1) < 12 and int(h1) >= 8) else 'am')
    
    return to_24h(h1, m1, p1), to_24h(h2, m2, p2)

def extract_lectures(cell_text: str) -> List[Lecture]:
    """Parses a cleaned cell string into one or more Lecture objects."""
    cell_text = normalize_ocr_text(cell_text)
    if not cell_text or "RECESS" in cell_text.upper():
        return []

    lectures = []
    raw_lectures = [l.strip() for l in cell_text.split('/')]
    
    for raw in raw_lectures:
        batch = None
        faculty = ""
        
        # Extract Batch (e.g., A1, B2)
        batch_match = re.search(r"\(([A-Z]\d+)\)", raw)
        if batch_match:
            batch = batch_match.group(1)
            raw = raw.replace(batch_match.group(0), "")
            
        # Extract Faculty Initials (e.g., AM, SL)
        faculty_match = re.search(r"\(([A-Z]{2,3})\)", raw)
        if faculty_match:
            faculty = faculty_match.group(1)
            raw = raw.replace(faculty_match.group(0), "")
            
        subject = raw.replace("()", "").strip()
        
        if subject:
            lectures.append(Lecture(
                subject=subject,
                faculty=faculty,
                batch=batch
            ))
            
    return lectures