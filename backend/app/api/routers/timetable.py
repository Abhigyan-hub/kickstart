from fastapi import APIRouter, UploadFile, File, HTTPException, status, Request
from app.schemas import TimetableResponse
from app.services.ocr_service import process_timetable
from app.logger import logger

router = APIRouter(prefix="/api/timetable", tags=["Timetable"])

@router.post("/upload", response_model=TimetableResponse, status_code=status.HTTP_200_OK)
async def upload_timetable(request: Request, image: UploadFile = File(...)):
    client_ip = request.client.host
    logger.info(f"CASCADE Timetable API [IP: {client_ip}]: Processing OCR upload: {image.filename}")
    
    if not image.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File provided is not an image.")

    try:
        image_bytes = await image.read()
        schedule = process_timetable(image_bytes)
        
        return TimetableResponse(schedule=schedule)
        
    except ValueError as ve:
        logger.error(f"Image Decoding Error: {str(ve)}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"OCR Pipeline Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to parse timetable. Ensure the image is a clear, tabular format."
        )