import cv2
import numpy as np
from typing import List, Dict, Any

def preprocess_and_extract_grid(image_bytes: bytes) -> List[List[Dict[str, Any]]]:
    """Extracts the tabular grid and maps physical X coordinates for handling merged cells."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise ValueError("Failed to decode image buffer.")
        
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Denoise and threshold
    thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
    
    kernel_len = max(10, gray.shape[1] // 100)
    ver_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, kernel_len))
    hor_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_len, 1))
    
    image_1 = cv2.erode(thresh, ver_kernel, iterations=3)
    vertical_lines = cv2.dilate(image_1, ver_kernel, iterations=3)
    
    image_2 = cv2.erode(thresh, hor_kernel, iterations=3)
    horizontal_lines = cv2.dilate(image_2, hor_kernel, iterations=3)
    
    table_mask = cv2.addWeighted(vertical_lines, 0.5, horizontal_lines, 0.5, 0.0)
    _, table_mask = cv2.threshold(table_mask, 128, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
    
    contours, _ = cv2.findContours(table_mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    
    bounding_boxes = [cv2.boundingRect(c) for c in contours]
    mean_area = np.mean([w * h for x, y, w, h in bounding_boxes]) if bounding_boxes else 0
    valid_boxes = [b for b in bounding_boxes if (b[2] * b[3]) > (mean_area * 0.1)]
    
    if not valid_boxes:
        return []

    valid_boxes.sort(key=lambda b: b[1]) # Sort top-to-bottom
    
    rows = []
    current_row = [valid_boxes[0]]
    
    for box in valid_boxes[1:]:
        if abs(box[1] - current_row[-1][1]) < 15:
            current_row.append(box)
        else:
            current_row.sort(key=lambda b: b[0]) # Sort left-to-right
            rows.append(current_row)
            current_row = [box]
            
    if current_row:
        current_row.sort(key=lambda b: b[0])
        rows.append(current_row)
        
    grid_data = []
    for row in rows:
        cell_data = []
        for (x, y, w, h) in row:
            y1, y2 = (y + 2 if h > 4 else y), (y + h - 2 if h > 4 else y + h)
            x1, x2 = (x + 2 if w > 4 else x), (x + w - 2 if w > 4 else x + w)
            
            cell_crop = gray[y1:y2, x1:x2]
            if cell_crop.size == 0:
                cell_crop = np.ones((10, 10), dtype=np.uint8) * 255
                
            cell_data.append({
                "img": cell_crop,
                "x_start": x,
                "x_end": x + w,
                "center_x": x + (w // 2)
            })
        grid_data.append(cell_data)
        
    return grid_data