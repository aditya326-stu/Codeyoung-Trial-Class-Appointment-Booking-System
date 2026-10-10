from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class Mentor(BaseModel):
    id: str
    name: str
    email: str
    timezone: str = "Asia/Kolkata"
    specialties: List[str]
    avatar: str
    bio: str
    active_from_ist: str = "10:00"  # 10:00 AM IST
    active_to_ist: str = "23:00"    # 11:00 PM IST (covering US morning/afternoon & UK afternoon/evening)
    max_daily_classes: int = 2

class SlotInfo(BaseModel):
    time: str              # e.g., "16:00"
    time_12h: str          # e.g., "4:00 PM"
    utc_iso: str           # ISO 8601 UTC timestamp
    ist_time: str          # e.g., "01:30 AM (Next Day)"
    is_available: bool
    available_mentors_count: int
    unavailability_reason: Optional[str] = None

class DaySlotsResponse(BaseModel):
    date: str              # Parent's selected date (YYYY-MM-DD)
    timezone: str          # Parent's selected timezone
    tz_abbreviation: str   # e.g. "EDT" or "EST"
    is_dst_active: bool
    offset: str
    slots: List[SlotInfo]
    total_slots: int
    available_slots: int

class BookingRequest(BaseModel):
    parent_name: str
    parent_email: str
    parent_phone: Optional[str] = ""
    student_name: str
    student_age: int
    course_interest: str
    parent_timezone: str
    slot_date: str          # YYYY-MM-DD
    slot_time: str          # HH:MM
    notes: Optional[str] = ""

class Booking(BaseModel):
    id: str
    parent_name: str
    parent_email: str
    parent_phone: Optional[str] = ""
    student_name: str
    student_age: int
    course_interest: str
    mentor_id: str
    mentor_name: str
    mentor_email: str
    utc_start_time: str
    utc_end_time: str
    parent_timezone: str
    parent_display_time: str
    mentor_timezone: str
    mentor_display_time: str
    mentor_ist_date: str
    demo_meeting_link: str
    created_at: str
    status: str = "confirmed"

class EmailNotification(BaseModel):
    id: str
    booking_id: str
    recipient_email: str
    recipient_role: str    # "parent" or "mentor"
    recipient_name: str
    subject: str
    body_html: str
    sent_at: str
