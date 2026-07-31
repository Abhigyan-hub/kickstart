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
load_dotenv()[cite: 13]

ADMIN_API_KEY = os.getenv("ADMIN_API_KEY")[cite: 13]
if not ADMIN_API_KEY:[cite: 13]
    raise ValueError("FATAL ERROR: ADMIN_API_KEY is not set in the .env file.")[cite: 13]

HEADER_NAME = os.getenv("API_KEY_HEADER_NAME", "X-Admin-Key")[cite: 13]
api_key_header = APIKeyHeader(name=HEADER_NAME, auto_error=True)[cite: 13]

def verify_admin_key(api_key: str = Security(api_key_header)):[cite: 13]
    if api_key != ADMIN_API_KEY:[cite: 13]
        logger.warning("Security Breach Attempt: Invalid Admin API Key provided.")[cite: 13]
        raise HTTPException([cite: 13]
            status_code=status.HTTP_403_FORBIDDEN,[cite: 13]
            detail="Could not validate admin credentials."[cite: 13]
        )
    return api_key[cite: 13]

# ==========================================
# APP INITIALIZATION
# ==========================================

# Initialize AWS tables
models.Base.metadata.create_all(bind=engine)[cite: 13]

# Use lifespan to track Server Startup and Shutdown Logs
@asynccontextmanager[cite: 13]
async def lifespan(app: FastAPI):[cite: 13]
    logger.info("Server Startup: CASCADE API is initializing and connecting to AWS RDS.")[cite: 13]
    yield[cite: 13]
    logger.warning("Server Shutdown: CASCADE API is shutting down.")[cite: 13]

app = FastAPI([cite: 13]
    title="CASCADE API",[cite: 13]
    lifespan=lifespan[cite: 13]
)

app.add_middleware([cite: 13]
    CORSMiddleware,[cite: 13]
    allow_origins=["*"],[cite: 13]
    allow_credentials=True,[cite: 13]
    allow_methods=["*"],[cite: 13]
    allow_headers=["*"],[cite: 13]
)

# Register the modular router here
app.include_router(timetable.router)

@app.get("/")[cite: 13]
def read_root(request: Request):[cite: 13]
    client_ip = request.client.host[cite: 13]
    logger.debug(f"API Log [IP: {client_ip}]: Health check endpoint accessed.")[cite: 13]
    return {"status": "online"}[cite: 13]

# ==========================================
# ADMIN ROUTES
# ==========================================

@app.post("/admin/students/", response_model=schemas.StudentResponse, status_code=status.HTTP_201_CREATED)[cite: 13]
def admin_create_student([cite: 13]
    student: schemas.StudentCreate, [cite: 13]
    request: Request, [cite: 13]
    db: Session = Depends(get_db),[cite: 13]
    api_key: str = Depends(verify_admin_key)[cite: 13]
):
    """Admin route to manually register a new student."""[cite: 13]
    client_ip = request.client.host[cite: 13]
    logger.info(f"API Log [IP: {client_ip}]: Admin attempting to create student profile for reg_number={student.reg_number}")[cite: 13]
    
    # Check if the registration number already exists
    existing_student = crud.get_student_by_reg_number(db, reg_number=student.reg_number)[cite: 13]
    if existing_student:[cite: 13]
        logger.error(f"Security/API Error [IP: {client_ip}]: Failed to create student. reg_number={student.reg_number} already exists in the system.")[cite: 13]
        raise HTTPException([cite: 13]
            status_code=status.HTTP_400_BAD_REQUEST, [cite: 13]
            detail="Registration number is already registered."[cite: 13]
        )
    
    # Create the student
    new_student = crud.create_student(db, student=student)[cite: 13]
    
    # Audit Log: Notice we explicitly log the name and ID, but NOT the payload containing the password
    logger.info(f"Audit Log [IP: {client_ip}]: Successfully created student profile for {new_student.full_name} (ID: {new_student.id}, Reg: {new_student.reg_number}).")[cite: 13]
    
    return new_student[cite: 13]

# ==========================================
# AUTHENTICATION ROUTES
# ==========================================

@app.post("/login/", response_model=schemas.StudentResponse, status_code=status.HTTP_200_OK)[cite: 13]
def login_student(login_data: schemas.StudentLogin, request: Request, db: Session = Depends(get_db)):[cite: 13]
    """Authenticates a student using their Registration Number and password hash."""[cite: 13]
    client_ip = request.client.host[cite: 13]
    logger.info(f"Authentication Log [IP: {client_ip}]: Login attempt for reg_number={login_data.reg_number}")[cite: 13]
    
    # Check the credentials against the database
    student = crud.verify_student_login(db, login_data)[cite: 13]
    
    if not student:[cite: 13]
        # If it fails, log the security event and return a 401 Unauthorized error
        logger.warning(f"Security Log [IP: {client_ip}]: Failed login attempt for reg_number={login_data.reg_number}. Invalid credentials.")[cite: 13]
        raise HTTPException([cite: 13]
            status_code=status.HTTP_401_UNAUTHORIZED,[cite: 13]
            detail="Invalid registration number or password."[cite: 13]
        )
        
    # If successful, log it and return the student profile
    logger.info(f"Authentication Log [IP: {client_ip}]: Successful login for {student.full_name} (Reg: {student.reg_number}).")[cite: 13]
    
    return student[cite: 13]

# ==========================================
# PASSWORD RECOVERY ROUTES
# ==========================================

def send_email_mock(to_email: str, otp: str):[cite: 13]
    """
    A temporary function to simulate sending an email. 
    This allows you to test the API flow without an SMTP server.
    """
    logger.info(f"MOCK EMAIL SENT TO {to_email}: Your CASCADE password reset OTP is {otp}")[cite: 13]

@app.post("/auth/request-otp", status_code=status.HTTP_200_OK)[cite: 13]
def request_password_reset_otp(payload: schemas.OTPRequest, request: Request, db: Session = Depends(get_db)):[cite: 13]
    client_ip = request.client.host[cite: 13]
    logger.info(f"Password Reset Log [IP: {client_ip}]: OTP requested for reg_number={payload.reg_number}")[cite: 13]
    
    student = crud.get_student_by_reg_number(db, payload.reg_number)[cite: 13]
    
    if not student:[cite: 13]
        # We return a generic message to prevent malicious actors from guessing valid registration numbers
        return {"message": "If that registration number exists, an OTP has been sent."}[cite: 13]
        
    # In production, check if the student has an email registered
    if not student.email:[cite: 13]
         logger.warning(f"Password Reset Error [IP: {client_ip}]: reg_number={payload.reg_number} has no email associated.")[cite: 13]
         # Returning 200 to not leak that the account lacks an email to an attacker
         return {"message": "If that registration number exists, an OTP has been sent."}[cite: 13]

    # Generate and save the OTP
    otp = crud.generate_and_save_otp(db, student)[cite: 13]
    
    # Send the email (Mocked for now)
    send_email_mock(student.email, otp)[cite: 13]
    
    return {"message": "If that registration number exists, an OTP has been sent."}[cite: 13]


@app.post("/auth/reset-password", status_code=status.HTTP_200_OK)[cite: 13]
def reset_password_with_otp(payload: schemas.OTPVerifyAndReset, request: Request, db: Session = Depends(get_db)):[cite: 13]
    client_ip = request.client.host[cite: 13]
    logger.info(f"Password Reset Log [IP: {client_ip}]: Attempting to reset password for reg_number={payload.reg_number}")[cite: 13]
    
    result = crud.verify_otp_and_update_password(db, payload)[cite: 13]
    
    if not result["success"]:[cite: 13]
        logger.warning(f"Password Reset Failed [IP: {client_ip}]: {result['message']}")[cite: 13]
        raise HTTPException([cite: 13]
            status_code=status.HTTP_400_BAD_REQUEST,[cite: 13]
            detail=result["message"][cite: 13]
        )
        
    logger.info(f"Password Reset Log [IP: {client_ip}]: Successfully updated password for reg_number={payload.reg_number}")[cite: 13]
    return {"message": "Password successfully reset."}[cite: 13]