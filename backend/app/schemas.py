from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date, datetime
from enum import Enum

# Match the Enum from your models.py
class AttendanceStatus(str, Enum):
    PENDING = "pending"
    ATTENDED = "attended"
    ABSENT = "absent"


# ==========================================
# 1. AUTHENTICATION & LOGIN SCHEMAS
# ==========================================

class StudentLogin(BaseModel):
    """Payload expected when a student logs in."""
    reg_number: str
    password_hash: str

class StudentPasswordReset(BaseModel):
    """Payload expected when a student sets their password for the first time."""
    reg_number: str
    password_hash: str


# ==========================================
# 2. STUDENT PROFILE SCHEMAS
# ==========================================

class StudentBase(BaseModel):
    """The core attributes shared across multiple Student actions."""
    reg_number: str
    full_name: str
    department: str
    semester: int
    section: str

class StudentCreate(StudentBase):
    """Payload expected when an Admin manually registers a new student."""
    password_hash: str

class StudentResponse(StudentBase):
    """The sanitized data returned to the app (NEVER return the password_hash)."""
    id: int
    created_at: datetime

    # This tells Pydantic to seamlessly read data from SQLAlchemy database models
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 3. ATTENDANCE SCHEMAS
# ==========================================

class AttendanceBase(BaseModel):
    """Core attributes of an attendance record."""
    subject: str
    room: Optional[str] = None
    class_date: date
    time_slot: str
    status: AttendanceStatus

class AttendanceCreate(AttendanceBase):
    """Payload for creating a new blank attendance matrix for the day."""
    pass

class AttendanceUpdate(BaseModel):
    """Payload sent when a student swipes left (attended) or right (absent)."""
    status: AttendanceStatus

class AttendanceResponse(AttendanceBase):
    """The data returned to the React Native app to render the timetable."""
    id: int
    student_id: int
    marked_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)