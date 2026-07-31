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
    for cell_img in grid[0][1:]:
        text = pytesseract.image_to_string(cell_img, config='--psm 6').strip()
        start, end = parse_time_slot(normalize_ocr_text(text))
        time_headers.append({"start": start, "end": end, "raw": text})

    valid_days = {"MON", "TUE", "WED", "THU", "FRI", "SAT"}
    final_schedule = []

    for row_idx, row in enumerate(grid[1:]):
        if not row:
            continue
            
        day_text = pytesseract.image_to_string(row[0], config='--psm 6').strip().upper()
        
        day_match = [d for d in valid_days if d in day_text]
        if not day_match:
            continue
            
        current_day = day_match[0]
        
        for col_idx, cell_img in enumerate(row[1:]):
            if col_idx >= len(time_headers):
                break
                
            time_slot = time_headers[col_idx]
            if not time_slot["start"]:
                continue 
                
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