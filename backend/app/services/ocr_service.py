import pytesseract
from pytesseract import Output
from app.utils.image_processing import preprocess_and_extract_grid
from app.utils.text_parser import extract_lectures, parse_time_slot, normalize_ocr_text
from app.schemas import TimeSlotSchedule
from app.logger import logger

def process_timetable(image_bytes: bytes) -> list[TimeSlotSchedule]:
    grid = preprocess_and_extract_grid(image_bytes)
    
    if len(grid) < 2:
        logger.warning("OCR Service: Table grid not detected or too small.")
        return []

    time_headers = []
    header_row_idx = -1

    # 1. DYNAMIC HEADER DETECTION
    # Scan the top rows to find the actual time slot headers, ignoring titles like "5th Sem"
    for r_idx, row in enumerate(grid[:8]):
        temp_headers = []
        valid_time_count = 0
        
        for cell_img in row:
            text = pytesseract.image_to_string(cell_img, config='--psm 6').strip()
            start, end = parse_time_slot(normalize_ocr_text(text))
            
            if start and end:
                valid_time_count += 1
                
            temp_headers.append({"start": start, "end": end, "raw": text})
            
        # If we find at least 2 valid time formats in a row, we've found the headers
        if valid_time_count >= 2:
            header_row_idx = r_idx
            time_headers = temp_headers
            logger.info(f"OCR Service: Time headers dynamically located at row index {r_idx}")
            break

    if header_row_idx == -1 or not time_headers:
        logger.warning("OCR Service: Could not find a row containing time slot headers.")
        return []

    valid_days = {"MON", "TUE", "WED", "THU", "FRI", "SAT"}
    final_schedule = []

    # 2. PROCESS LECTURES
    # Only iterate through the rows that come *after* the time headers
    for row_idx, row in enumerate(grid[header_row_idx + 1:]):
        if not row:
            continue
            
        # Find the Day column (usually index 0, but sometimes shifted by OpenCV noise)
        current_day = None
        day_col_idx = -1
        
        for c_idx in range(min(2, len(row))):
            day_text = pytesseract.image_to_string(row[c_idx], config='--psm 6').strip().upper()
            day_match = [d for d in valid_days if d in day_text]
            if day_match:
                current_day = day_match[0]
                day_col_idx = c_idx
                break
                
        if not current_day:
            continue
            
        # Match the remaining columns against the aligned time headers
        for col_idx, cell_img in enumerate(row):
            if col_idx <= day_col_idx:
                continue 
                
            if col_idx >= len(time_headers):
                break
                
            time_slot = time_headers[col_idx]
            if not time_slot["start"]:
                continue 
                
            # Run OCR to get text and confidence scores
            ocr_data = pytesseract.image_to_data(cell_img, output_type=Output.DICT, config='--psm 6')
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
                needs_verification = avg_conf < 65.0
                
                final_schedule.append(TimeSlotSchedule(
                    day=current_day,
                    start=time_slot["start"],
                    end=time_slot["end"],
                    lectures=lectures,
                    needsVerification=needs_verification
                ))

    return final_schedule