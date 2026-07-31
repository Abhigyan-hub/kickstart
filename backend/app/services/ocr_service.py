import pytesseract
import cv2
from pytesseract import Output
from app.utils.image_processing import preprocess_and_extract_grid
from app.utils.text_parser import extract_lectures, parse_time_slot, normalize_ocr_text
from app.schemas import TimeSlotSchedule
from app.logger import logger

def process_timetable(image_bytes: bytes) -> list[TimeSlotSchedule]:
    grid = preprocess_and_extract_grid(image_bytes)
    
    if len(grid) < 2:
        raise ValueError("Failed: OpenCV could not detect a distinct table grid with borders.")

    # 1. FIND ANCHOR DAY ("MON" or "TUE") TO BYPASS MULTIPLE TITLE ROWS
    anchor_row_idx = -1
    for r_idx, row in enumerate(grid):
        for cell in row[:3]:
            # Upscale image 1.5x for highly accurate Tesseract readings
            scaled = cv2.resize(cell["img"], None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
            text = pytesseract.image_to_string(scaled, config='--psm 6').strip().upper()
            if "MON" in text or "TUE" in text:
                anchor_row_idx = r_idx
                break
        if anchor_row_idx != -1:
            break

    if anchor_row_idx == -1:
        raise ValueError("Failed: Table grid detected, but could not find 'MON' or 'TUE' to anchor the columns.")

    header_row_idx = anchor_row_idx - 1
    if header_row_idx < 0:
        raise ValueError("Failed: Found days, but time headers were not found above them.")

    # 2. PARSE TIME HEADERS AND MAP THEIR X-COORDINATES
    time_headers = []
    for cell in grid[header_row_idx]:
        scaled = cv2.resize(cell["img"], None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
        text = pytesseract.image_to_string(scaled, config='--psm 6').strip()
        start, end = parse_time_slot(normalize_ocr_text(text))
        
        if start:
            time_headers.append({
                "start": start, 
                "end": end, 
                "x_start": cell["x_start"], 
                "x_end": cell["x_end"]
            })

    if not time_headers:
        raise ValueError("Failed: Could not extract valid time ranges from the header row.")

    # 3. MAP LECTURES BY X-COORDINATE OVERLAP (SOLVES MERGED CELLS)
    valid_days = {"MON", "TUE", "WED", "THU", "FRI", "SAT"}
    final_schedule = []

    for row_idx in range(anchor_row_idx, len(grid)):
        row = grid[row_idx]
        if not row: continue
        
        current_day = None
        for cell in row[:2]:
            scaled = cv2.resize(cell["img"], None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
            day_text = pytesseract.image_to_string(scaled, config='--psm 6').strip().upper()
            day_match = [d for d in valid_days if d in day_text]
            if day_match:
                current_day = day_match[0]
                break
                
        if not current_day:
            continue
            
        for cell in row:
            # Find which time column this cell's physical center belongs to
            matched_time = None
            for th in time_headers:
                if th["x_start"] <= cell["center_x"] <= th["x_end"]:
                    matched_time = th
                    break
                    
            if not matched_time:
                continue 
                
            # Extract Lecture Data
            scaled = cv2.resize(cell["img"], None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
            ocr_data = pytesseract.image_to_data(scaled, output_type=Output.DICT, config='--psm 6')
            
            text_parts = []
            confidences = []
            for i, word in enumerate(ocr_data['text']):
                if word.strip():
                    text_parts.append(word)
                    conf = int(ocr_data['conf'][i])
                    if conf > 0:
                        confidences.append(conf)
                        
            cell_text = " ".join(text_parts)
            lectures = extract_lectures(cell_text)
            
            if lectures:
                avg_conf = sum(confidences) / len(confidences) if confidences else 0
                final_schedule.append(TimeSlotSchedule(
                    day=current_day,
                    start=matched_time["start"],
                    end=matched_time["end"],
                    lectures=lectures,
                    needsVerification=(avg_conf < 65.0)
                ))

    return final_schedule