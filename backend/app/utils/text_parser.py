import re
from typing import List, Optional, Tuple
from app.schemas import Lecture

def normalize_ocr_text(text: str) -> str:
    """Fixes common Tesseract OCR errors, normalizes spacing, and ignores whitespace in room numbers."""
    if not text:
        return ""
    
    replacements = {
        r"\b0S\b": "OS",
        r"\bCornp\b": "Comp",
        r"\bOE\s*-\s*III\b": "OE III",
    }
    
    for pattern, replacement in replacements.items():
        text = re.sub(pattern, replacement, text)
        
    # Ignore classroom numbers even with spaces (e.g., C315, C 315, A 017)
    text = re.sub(r"\b[A-C]\s*\d{3}\b|\bA\s*017\b", "", text)
    
    # Normalize multiple spaces and newlines
    text = re.sub(r"\s+", " ", text).strip()
    return text

def parse_time_slot(text: str) -> Tuple[Optional[str], Optional[str]]:
    """Converts time ranges while tolerating extreme whitespace (e.g. '12 . 10 pm - 1 : 05 pm')."""
    # Added \s* everywhere to tolerate spaces between numbers, colons, and am/pm
    time_pattern = r"(\d{1,2})\s*[\.\:]\s*(\d{2})\s*(am|pm)?\s*-\s*(\d{1,2})\s*[\.\:]\s*(\d{2})\s*(am|pm)?"
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
    """Parses a cleaned cell string into one or more Lecture objects, ignoring inner whitespaces."""
    cell_text = normalize_ocr_text(cell_text)
    if not cell_text or "RECESS" in cell_text.upper():
        return []

    lectures = []
    raw_lectures = [l.strip() for l in cell_text.split('/')]
    
    for raw in raw_lectures:
        batch = None
        faculty = ""
        
        # Extract Batch (e.g., A1, A 1, ( A 1 )) - Ignores whitespace
        batch_match = re.search(r"\(\s*([A-Z]\s*\d+)\s*\)", raw)
        if batch_match:
            batch = batch_match.group(1).replace(" ", "") # Removes inner spaces to return 'A1'
            raw = raw.replace(batch_match.group(0), "")
            
        # Extract Faculty Initials (e.g., AM, A M, ( A M )) - Ignores whitespace
        faculty_match = re.search(r"\(\s*([A-Z](?:\s*[A-Z]){1,2})\s*\)", raw)
        if faculty_match:
            faculty = faculty_match.group(1).replace(" ", "") # Removes inner spaces to return 'AM'
            raw = raw.replace(faculty_match.group(0), "")
            
        subject = raw.replace("()", "").strip()
        
        if subject:
            lectures.append(Lecture(
                subject=subject,
                faculty=faculty,
                batch=batch
            ))
            
    return lectures