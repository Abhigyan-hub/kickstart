from sqlalchemy.orm import Session
from app import models, schemas
import random
from datetime import datetime, timedelta

# ==========================================
# STUDENT / AUTHENTICATION LOGIC
# ==========================================

def get_student_by_reg_number(db: Session, reg_number: str):
    """Fetches a student from the database using their Registration Number."""
    return db.query(models.Student).filter(models.Student.reg_number == reg_number).first()

def create_student(db: Session, student: schemas.StudentCreate):
    """Inserts a new student into the database."""
    # Create the SQLAlchemy model instance
    db_student = models.Student(
        reg_number=student.reg_number,
        password_hash=student.password_hash,
        full_name=student.full_name,
        department=student.department,
        semester=student.semester,
        section=student.section
    )
    
    # Save it to AWS
    db.add(db_student)
    db.commit()
    db.refresh(db_student) # Refreshes to get the auto-generated ID and created_at timestamp
    
    return db_student

def verify_student_login(db: Session, login_data: schemas.StudentLogin):
    """Checks if the registration number exists and the password matches."""
    student = get_student_by_reg_number(db, login_data.reg_number)
    
    if not student:
        return None
        
    # In a real app, you would use a hashing library like 'passlib' here to verify,
    # but since we are doing SHA-256 on the frontend, we compare the hashes directly.
    if student.password_hash == login_data.password_hash:
        return student
        
    return None

def set_student_password(db: Session, reset_data: schemas.StudentPasswordReset):
    """Updates the password hash for a first-time login."""
    student = get_student_by_reg_number(db, reset_data.reg_number)
    if student:
        student.password_hash = reset_data.password_hash
        db.commit()
        db.refresh(student)
        return student
    return None

# ==========================================
# TIMETABLE / ATTENDANCE LOGIC
# ==========================================

def get_student_attendance_today(db: Session, student_id: int, today_date):
    """Fetches all classes for a specific student on a specific date."""
    return db.query(models.Attendance).filter(
        models.Attendance.student_id == student_id,
        models.Attendance.class_date == today_date
    ).all()

def update_attendance_status(db: Session, attendance_id: int, status_update: schemas.AttendanceUpdate):
    """Updates a specific class to 'attended' or 'absent' when you swipe the card."""
    record = db.query(models.Attendance).filter(models.Attendance.id == attendance_id).first()
    
    if record:
        record.status = status_update.status
        # Automatically record the exact timestamp of the swipe
        from datetime import datetime
        record.marked_at = datetime.utcnow() 
        
        db.commit()
        db.refresh(record)
        return record
    return None

def generate_and_save_otp(db: Session, student: models.Student):
    """Generates a 6-digit OTP, sets a 10-minute expiration, and saves it."""
    # Generate a random 6-digit string
    otp = str(random.randint(100000, 999999))
    
    # Set expiration to 10 minutes from now
    expires = datetime.utcnow() + timedelta(minutes=10)
    
    student.reset_otp = otp
    student.otp_expires_at = expires
    
    db.commit()
    db.refresh(student)
    return otp

def verify_otp_and_update_password(db: Session, reset_data: schemas.OTPVerifyAndReset):
    """Validates the OTP and updates the password if valid."""
    student = get_student_by_reg_number(db, reset_data.reg_number)
    
    if not student:
        return {"success": False, "message": "Student not found."}
        
    if not student.reset_otp or not student.otp_expires_at:
        return {"success": False, "message": "No OTP requested."}
        
    if datetime.utcnow() > student.otp_expires_at:
        return {"success": False, "message": "OTP has expired."}
        
    if student.reset_otp != reset_data.otp:
        return {"success": False, "message": "Invalid OTP."}
        
    # If everything is valid, update the password and clear the OTP fields
    student.password_hash = reset_data.new_password_hash
    student.reset_otp = None
    student.otp_expires_at = None
    
    db.commit()
    return {"success": True, "message": "Password updated successfully."}