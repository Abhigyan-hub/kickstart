import os
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, status, Request, Security
from fastapi.security.api_key import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager

from app import models, schemas, crud
from app.database import engine, get_db
from app.logger import logger

# Import the new modular timetable router
from app.api.routers import timetable

# ==========================================
# ENVIRONMENT VARIABLES & SECURITY
# ==========================================
load_dotenv()

ADMIN_API_KEY = os.getenv("ADMIN_API_KEY")
if not ADMIN_API_KEY:
    raise ValueError("FATAL ERROR: ADMIN_API_KEY is not set in the .env file.")

HEADER_NAME = os.getenv("API_KEY_HEADER_NAME", "X-Admin-Key")
api_key_header = APIKeyHeader(name=HEADER_NAME, auto_error=True)

def verify_admin_key(api_key: str = Security(api_key_header)):
    if api_key != ADMIN_API_KEY:
        logger.warning("Security Breach Attempt: Invalid Admin API Key provided.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate admin credentials."
        )
    return api_key

# ==========================================
# APP INITIALIZATION
# ==========================================

# Initialize AWS tables
models.Base.metadata.create_all(bind=engine)

# Use lifespan to track Server Startup and Shutdown Logs
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Server Startup: CASCADE API is initializing and connecting to AWS RDS.")
    yield
    logger.warning("Server Shutdown: CASCADE API is shutting down.")

app = FastAPI(
    title="CASCADE API",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register the modular router here
app.include_router(timetable.router)

@app.get("/")
def read_root(request: Request):
    client_ip = request.client.host
    logger.debug(f"API Log [IP: {client_ip}]: Health check endpoint accessed.")
    return {"status": "online"}

# ==========================================
# ADMIN ROUTES
# ==========================================

@app.post("/admin/students/", response_model=schemas.StudentResponse, status_code=status.HTTP_201_CREATED)
def admin_create_student(
    student: schemas.StudentCreate, 
    request: Request, 
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_admin_key)
):
    """Admin route to manually register a new student."""
    client_ip = request.client.host
    logger.info(f"API Log [IP: {client_ip}]: Admin attempting to create student profile for reg_number={student.reg_number}")
    
    # Check if the registration number already exists
    existing_student = crud.get_student_by_reg_number(db, reg_number=student.reg_number)
    if existing_student:
        logger.error(f"Security/API Error [IP: {client_ip}]: Failed to create student. reg_number={student.reg_number} already exists in the system.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Registration number is already registered."
        )
    
    # Create the student
    new_student = crud.create_student(db, student=student)
    
    # Audit Log: Notice we explicitly log the name and ID, but NOT the payload containing the password
    logger.info(f"Audit Log [IP: {client_ip}]: Successfully created student profile for {new_student.full_name} (ID: {new_student.id}, Reg: {new_student.reg_number}).")
    
    return new_student

# ==========================================
# AUTHENTICATION ROUTES
# ==========================================

@app.post("/login/", response_model=schemas.StudentResponse, status_code=status.HTTP_200_OK)
def login_student(login_data: schemas.StudentLogin, request: Request, db: Session = Depends(get_db)):
    """Authenticates a student using their Registration Number and password hash."""
    client_ip = request.client.host
    logger.info(f"Authentication Log [IP: {client_ip}]: Login attempt for reg_number={login_data.reg_number}")
    
    # Check the credentials against the database
    student = crud.verify_student_login(db, login_data)
    
    if not student:
        # If it fails, log the security event and return a 401 Unauthorized error
        logger.warning(f"Security Log [IP: {client_ip}]: Failed login attempt for reg_number={login_data.reg_number}. Invalid credentials.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid registration number or password."
        )
        
    # If successful, log it and return the student profile
    logger.info(f"Authentication Log [IP: {client_ip}]: Successful login for {student.full_name} (Reg: {student.reg_number}).")
    
    return student

# ==========================================
# PASSWORD RECOVERY ROUTES
# ==========================================

def send_email_mock(to_email: str, otp: str):
    """
    A temporary function to simulate sending an email. 
    This allows you to test the API flow without an SMTP server.
    """
    logger.info(f"MOCK EMAIL SENT TO {to_email}: Your CASCADE password reset OTP is {otp}")

@app.post("/auth/request-otp", status_code=status.HTTP_200_OK)
def request_password_reset_otp(payload: schemas.OTPRequest, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host
    logger.info(f"Password Reset Log [IP: {client_ip}]: OTP requested for reg_number={payload.reg_number}")
    
    student = crud.get_student_by_reg_number(db, payload.reg_number)
    
    if not student:
        # We return a generic message to prevent malicious actors from guessing valid registration numbers
        return {"message": "If that registration number exists, an OTP has been sent."}
        
    # In production, check if the student has an email registered
    if not student.email:
         logger.warning(f"Password Reset Error [IP: {client_ip}]: reg_number={payload.reg_number} has no email associated.")
         # Returning 200 to not leak that the account lacks an email to an attacker
         return {"message": "If that registration number exists, an OTP has been sent."}

    # Generate and save the OTP
    otp = crud.generate_and_save_otp(db, student)
    
    # Send the email (Mocked for now)
    send_email_mock(student.email, otp)
    
    return {"message": "If that registration number exists, an OTP has been sent."}


@app.post("/auth/reset-password", status_code=status.HTTP_200_OK)
def reset_password_with_otp(payload: schemas.OTPVerifyAndReset, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host
    logger.info(f"Password Reset Log [IP: {client_ip}]: Attempting to reset password for reg_number={payload.reg_number}")
    
    result = crud.verify_otp_and_update_password(db, payload)
    
    if not result["success"]:
        logger.warning(f"Password Reset Failed [IP: {client_ip}]: {result['message']}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )
        
    logger.info(f"Password Reset Log [IP: {client_ip}]: Successfully updated password for reg_number={payload.reg_number}")
    return {"message": "Password successfully reset."}