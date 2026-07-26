import os
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Request, Security
from fastapi.security.api_key import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
import pytesseract
from PIL import Image
import io
import cv2          # <-- Added for OpenCV image preprocessing
import numpy as np  # <-- Added for array manipulation with OpenCV

from app import models, schemas, crud
from app.database import engine, get_db
from app.logger import logger
from datetime import datetime

# ==========================================
# ENVIRONMENT VARIABLES & SECURITY
# ==========================================
load_dotenv() #[cite: 1]

ADMIN_API_KEY = os.getenv("ADMIN_API_KEY") #[cite: 1]
if not ADMIN_API_KEY: #[cite: 1]
    raise ValueError("FATAL ERROR: ADMIN_API_KEY is not set in the .env file.") #[cite: 1]

HEADER_NAME = os.getenv("API_KEY_HEADER_NAME", "X-Admin-Key") #[cite: 1]
api_key_header = APIKeyHeader(name=HEADER_NAME, auto_error=True) #[cite: 1]

def verify_admin_key(api_key: str = Security(api_key_header)): #[cite: 1]
    if api_key != ADMIN_API_KEY: #[cite: 1]
        logger.warning("Security Breach Attempt: Invalid Admin API Key provided.") #[cite: 1]
        raise HTTPException( #[cite: 1]
            status_code=status.HTTP_403_FORBIDDEN, #[cite: 1]
            detail="Could not validate admin credentials." #[cite: 1]
        )
    return api_key #[cite: 1]

# ==========================================
# APP INITIALIZATION
# ==========================================

# Initialize AWS tables
models.Base.metadata.create_all(bind=engine) #[cite: 1]

# Use lifespan to track Server Startup and Shutdown Logs
@asynccontextmanager #[cite: 1]
async def lifespan(app: FastAPI): #[cite: 1]
    logger.info("Server Startup: CASCADE API is initializing and connecting to AWS RDS.") #[cite: 1]
    yield #[cite: 1]
    logger.warning("Server Shutdown: CASCADE API is shutting down.") #[cite: 1]

app = FastAPI( #[cite: 1]
    title="CASCADE API", #[cite: 1]
    lifespan=lifespan #[cite: 1]
)

app.add_middleware( #[cite: 1]
    CORSMiddleware, #[cite: 1]
    allow_origins=["*"], #[cite: 1]
    allow_credentials=True, #[cite: 1]
    allow_methods=["*"], #[cite: 1]
    allow_headers=["*"], #[cite: 1]
)

@app.get("/") #[cite: 1]
def read_root(request: Request): #[cite: 1]
    client_ip = request.client.host #[cite: 1]
    logger.debug(f"API Log [IP: {client_ip}]: Health check endpoint accessed.") #[cite: 1]
    return {"status": "online"} #[cite: 1]

# ==========================================
# ADMIN ROUTES
# ==========================================

@app.post("/admin/students/", response_model=schemas.StudentResponse, status_code=status.HTTP_201_CREATED) #[cite: 1]
def admin_create_student( #[cite: 1]
    student: schemas.StudentCreate,  #[cite: 1]
    request: Request,  #[cite: 1]
    db: Session = Depends(get_db), #[cite: 1]
    api_key: str = Depends(verify_admin_key) # <-- Security lock activated[cite: 1]
):
    """Admin route to manually register a new student.""" #[cite: 1]
    client_ip = request.client.host #[cite: 1]
    logger.info(f"API Log [IP: {client_ip}]: Admin attempting to create student profile for reg_number={student.reg_number}") #[cite: 1]
    
    # Check if the registration number already exists
    existing_student = crud.get_student_by_reg_number(db, reg_number=student.reg_number) #[cite: 1]
    if existing_student: #[cite: 1]
        logger.error(f"Security/API Error [IP: {client_ip}]: Failed to create student. reg_number={student.reg_number} already exists in the system.") #[cite: 1]
        raise HTTPException( #[cite: 1]
            status_code=status.HTTP_400_BAD_REQUEST,  #[cite: 1]
            detail="Registration number is already registered." #[cite: 1]
        )
    
    # Create the student
    new_student = crud.create_student(db, student=student) #[cite: 1]
    
    # Audit Log: Notice we explicitly log the name and ID, but NOT the payload containing the password
    logger.info(f"Audit Log [IP: {client_ip}]: Successfully created student profile for {new_student.full_name} (ID: {new_student.id}, Reg: {new_student.reg_number}).") #[cite: 1]
    
    return new_student #[cite: 1]

# ==========================================
# AUTHENTICATION ROUTES
# ==========================================

@app.post("/login/", response_model=schemas.StudentResponse, status_code=status.HTTP_200_OK) #[cite: 1]
def login_student(login_data: schemas.StudentLogin, request: Request, db: Session = Depends(get_db)): #[cite: 1]
    """Authenticates a student using their Registration Number and password hash.""" #[cite: 1]
    client_ip = request.client.host #[cite: 1]
    logger.info(f"Authentication Log [IP: {client_ip}]: Login attempt for reg_number={login_data.reg_number}") #[cite: 1]
    
    # Check the credentials against the database
    student = crud.verify_student_login(db, login_data) #[cite: 1]
    
    if not student: #[cite: 1]
        # If it fails, log the security event and return a 401 Unauthorized error
        logger.warning(f"Security Log [IP: {client_ip}]: Failed login attempt for reg_number={login_data.reg_number}. Invalid credentials.") #[cite: 1]
        raise HTTPException( #[cite: 1]
            status_code=status.HTTP_401_UNAUTHORIZED, #[cite: 1]
            detail="Invalid registration number or password." #[cite: 1]
        )
        
    # If successful, log it and return the student profile
    logger.info(f"Authentication Log [IP: {client_ip}]: Successful login for {student.full_name} (Reg: {student.reg_number}).") #[cite: 1]
    
    return student #[cite: 1]

# ==========================================
# TIMETABLE OCR ROUTE
# ==========================================

@app.post("/upload-timetable/", status_code=status.HTTP_200_OK) #[cite: 1]
async def process_timetable(request: Request, file: UploadFile = File(...)): #[cite: 1]
    """Receives a timetable image from the mobile app, preprocesses it with OpenCV, and returns the extracted OCR text."""
    client_ip = request.client.host #[cite: 1]
    logger.info(f"OCR Log [IP: {client_ip}]: Receiving timetable image for processing: {file.filename}") #[cite: 1]
    
    try:
        # 1. Read the image bytes from the incoming request
        image_bytes = await file.read() #[cite: 1]
        
        # 2. Convert bytes to a numpy array for OpenCV
        nparr = np.frombuffer(image_bytes, np.uint8)
        img_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img_cv is None:
            raise ValueError("Could not decode image.")

        # 3. PREPROCESSING: Grayscale and Binarization
        # Convert to grayscale to remove color noise
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        
        # Apply adaptive thresholding to force the background to white and text to black
        processed_img = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        
        # 4. Pass the cleaned image to Tesseract to extract the raw text
        raw_text = pytesseract.image_to_string(processed_img)
        
        # Log the exact length of the extracted text
        logger.info(f"OCR Log [IP: {client_ip}]: Successfully extracted {len(raw_text.strip())} characters from the image.") #[cite: 1]
        
        if not raw_text.strip(): #[cite: 1]
            logger.warning(f"OCR Log [IP: {client_ip}]: Warning - Tesseract returned completely blank text!") #[cite: 1]
        
        # 5. Return the text exactly as the React Native app expects it
        return {"text": raw_text} #[cite: 1]
        
    except BaseException as e: #[cite: 1]
        logger.error(f"OCR Processing Error [IP: {client_ip}]: {str(e)}") #[cite: 1]
        raise HTTPException( #[cite: 1]
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, #[cite: 1]
            detail="Failed to process the timetable image on the server." #[cite: 1]
        )

# ==========================================
# PASSWORD RECOVERY ROUTES
# ==========================================

def send_email_mock(to_email: str, otp: str): #[cite: 1]
    """
    A temporary function to simulate sending an email. 
    This allows you to test the API flow without an SMTP server.
    """
    logger.info(f"MOCK EMAIL SENT TO {to_email}: Your CASCADE password reset OTP is {otp}") #[cite: 1]

@app.post("/auth/request-otp", status_code=status.HTTP_200_OK) #[cite: 1]
def request_password_reset_otp(payload: schemas.OTPRequest, request: Request, db: Session = Depends(get_db)): #[cite: 1]
    client_ip = request.client.host #[cite: 1]
    logger.info(f"Password Reset Log [IP: {client_ip}]: OTP requested for reg_number={payload.reg_number}") #[cite: 1]
    
    student = crud.get_student_by_reg_number(db, payload.reg_number) #[cite: 1]
    
    if not student: #[cite: 1]
        # We return a generic message to prevent malicious actors from guessing valid registration numbers
        return {"message": "If that registration number exists, an OTP has been sent."} #[cite: 1]
        
    # In production, check if the student has an email registered
    if not student.email: #[cite: 1]
         logger.warning(f"Password Reset Error [IP: {client_ip}]: reg_number={payload.reg_number} has no email associated.") #[cite: 1]
         # Returning 200 to not leak that the account lacks an email to an attacker
         return {"message": "If that registration number exists, an OTP has been sent."} #[cite: 1]

    # Generate and save the OTP
    otp = crud.generate_and_save_otp(db, student) #[cite: 1]
    
    # Send the email (Mocked for now)
    send_email_mock(student.email, otp) #[cite: 1]
    
    return {"message": "If that registration number exists, an OTP has been sent."} #[cite: 1]


@app.post("/auth/reset-password", status_code=status.HTTP_200_OK) #[cite: 1]
def reset_password_with_otp(payload: schemas.OTPVerifyAndReset, request: Request, db: Session = Depends(get_db)): #[cite: 1]
    client_ip = request.client.host #[cite: 1]
    logger.info(f"Password Reset Log [IP: {client_ip}]: Attempting to reset password for reg_number={payload.reg_number}") #[cite: 1]
    
    result = crud.verify_otp_and_update_password(db, payload) #[cite: 1]
    
    if not result["success"]: #[cite: 1]
        logger.warning(f"Password Reset Failed [IP: {client_ip}]: {result['message']}") #[cite: 1]
        raise HTTPException( #[cite: 1]
            status_code=status.HTTP_400_BAD_REQUEST, #[cite: 1]
            detail=result["message"] #[cite: 1]
        )
        
    logger.info(f"Password Reset Log [IP: {client_ip}]: Successfully updated password for reg_number={payload.reg_number}") #[cite: 1]
    return {"message": "Password successfully reset."} #[cite: 1]