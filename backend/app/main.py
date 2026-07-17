from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager

from app import models, schemas, crud
from app.database import engine, get_db
from app.logger import logger

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

@app.get("/")
def read_root():
    logger.debug("API Log: Health check endpoint accessed.")
    return {"status": "online"}

# ==========================================
# ADMIN ROUTES
# ==========================================

@app.post("/admin/students/", response_model=schemas.StudentResponse, status_code=status.HTTP_201_CREATED)
def admin_create_student(student: schemas.StudentCreate, db: Session = Depends(get_db)):
    """Admin route to manually register a new student."""
    
    logger.info(f"API Log: Admin attempting to create student profile for reg_number={student.reg_number}")
    
    # Check if the registration number already exists
    existing_student = crud.get_student_by_reg_number(db, reg_number=student.reg_number)
    if existing_student:
        logger.error(f"Security/API Error: Failed to create student. reg_number={student.reg_number} already exists in the system.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Registration number is already registered."
        )
    
    # Create the student
    new_student = crud.create_student(db, student=student)
    
    # Audit Log: Notice we explicitly log the name and ID, but NOT the payload containing the password
    logger.info(f"Audit Log: Successfully created student profile for {new_student.full_name} (ID: {new_student.id}, Reg: {new_student.reg_number}).")
    
    return new_student

# ==========================================
# AUTHENTICATION ROUTES
# ==========================================

@app.post("/login/", response_model=schemas.StudentResponse, status_code=status.HTTP_200_OK)
def login_student(login_data: schemas.StudentLogin, db: Session = Depends(get_db)):
    """Authenticates a student using their Registration Number and password hash."""
    
    logger.info(f"Authentication Log: Login attempt for reg_number={login_data.reg_number}")
    
    # Check the credentials against the database
    student = crud.verify_student_login(db, login_data)
    
    if not student:
        # If it fails, log the security event and return a 401 Unauthorized error
        logger.warning(f"Security Log: Failed login attempt for reg_number={login_data.reg_number}. Invalid credentials.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid registration number or password."
        )
        
    # If successful, log it and return the student profile
    logger.info(f"Authentication Log: Successful login for {student.full_name} (Reg: {student.reg_number}).")
    
    return student