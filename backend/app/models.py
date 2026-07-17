from sqlalchemy import Column, Integer, String, ForeignKey, Date, DateTime, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import enum

Base = declarative_base()

# Define an Enum for strict status tracking, matching your React Native frontend
class AttendanceStatus(str, enum.Enum):
    PENDING = "pending"
    ATTENDED = "attended"
    ABSENT = "absent"

class Student(Base):
    __tablename__ = "students"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Core Authentication (Matches the React Native Login Screen)
    reg_number = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False) # Stores the SHA-256 hash
    
    # Academic Profile (e.g., G. H. Raisoni Skilltech University structure)
    full_name = Column(String(100), nullable=False)
    department = Column(String(50), nullable=False)     # e.g., "B.Tech CSE"
    semester = Column(Integer, nullable=False)          # e.g., 5
    section = Column(String(10), nullable=False)        # e.g., "A"
    
    # Audit Trail
    created_at = Column(DateTime, default=datetime.utcnow)

    # Establish a One-to-Many relationship with the Attendance table
    attendance_records = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")


class Attendance(Base):
    __tablename__ = "attendance_records"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign Key linking back to the Student
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    
    # Class Details (Mapped from your OCR OCR output)
    subject = Column(String(100), nullable=False)       # e.g., "OS (AM)" or "FLA (SN)"
    room = Column(String(50), nullable=True)            # e.g., "A-232A"
    
    # Time and Tracking
    class_date = Column(Date, nullable=False)           
    time_slot = Column(String(50), nullable=False)      # e.g., "12.10pm\n1.05pm"
    
    # Status using the strict Enum
    status = Column(Enum(AttendanceStatus), default=AttendanceStatus.PENDING, nullable=False)
    
    # Audit Trail
    marked_at = Column(DateTime, nullable=True)         # Timestamp of when the swipe happened
    
    # Establish the inverse relationship
    student = relationship("Student", back_populates="attendance_records")