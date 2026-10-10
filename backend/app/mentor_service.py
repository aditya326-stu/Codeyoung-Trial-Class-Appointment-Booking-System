"""
Mentor Assignment, Scheduling, and Booking Management Engine.
Enforces the 10-mentor roster, 2 demo classes/day/mentor limit,
and automatic least-loaded mentor dispatching with round-the-clock shift coverage.
"""

from app.database import db
from app.email_service import send_email
import logging
from datetime import datetime, timedelta, time
import os
from zoneinfo import ZoneInfo
import uuid
from typing import List, Dict, Optional, Tuple, Any

from app.models import Mentor, Booking, BookingRequest, EmailNotification, SlotInfo, DaySlotsResponse
from app.timezone_utils import (
    local_to_utc,
    utc_to_local,
    format_datetime_for_tz,
    get_timezone_details,
    DEFAULT_MENTOR_TZ
)

# 10 Expert Mentors with diverse shift coverage for UK, US East, US West & India
logger = logging.getLogger(__name__)

INITIAL_MENTORS = [
    Mentor(
        id="mentor-1",
        name="Aarav Sharma",
        email="aarav.sharma@codeyoung.com",
        timezone="Asia/Kolkata",
        specialties=["Python for Kids", "Scratch & Game Dev"],
        avatar="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        bio="Senior coding instructor with 5+ years teaching Scratch and Python to elementary students.",
        active_from_ist="10:00",
        active_to_ist="22:00",
        max_daily_classes=2
    ),
    Mentor(
        id="mentor-2",
        name="Priya Patel",
        email="priya.patel@codeyoung.com",
        timezone="Asia/Kolkata",
        specialties=["Robotics & Web Development", "HTML/CSS/JS"],
        avatar="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
        bio="STEM enthusiast specializing in interactive creative coding and logic puzzles.",
        active_from_ist="10:00",
        active_to_ist="22:00",
        max_daily_classes=2
    ),
    Mentor(
        id="mentor-3",
        name="Rohan Gupta",
        email="rohan.gupta@codeyoung.com",
        timezone="Asia/Kolkata",
        specialties=["Data Science & AI for Kids", "Python"],
        avatar="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        bio="Former software engineer passionate about demystifying AI and math for middle schoolers.",
        active_from_ist="12:00",
        active_to_ist="23:30",
        max_daily_classes=2
    ),
    Mentor(
        id="mentor-4",
        name="Ananya Iyer",
        email="ananya.iyer@codeyoung.com",
        timezone="Asia/Kolkata",
        specialties=["Game Design & Roblox Studio", "Scratch"],
        avatar="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
        bio="Specialist in 3D game logic and interactive storytelling for young creators.",
        active_from_ist="14:00",
        active_to_ist="01:00",
        max_daily_classes=2
    ),
    Mentor(
        id="mentor-5",
        name="Vikram Malhotra",
        email="vikram.malhotra@codeyoung.com",
        timezone="Asia/Kolkata",
        specialties=["App Development", "JavaScript & Python"],
        avatar="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
        bio="Expert in visual block-to-text transitions and mobile app building.",
        active_from_ist="16:00",
        active_to_ist="03:00",
        max_daily_classes=2
    ),
    Mentor(
        id="mentor-6",
        name="Neha Sen",
        email="neha.sen@codeyoung.com",
        timezone="Asia/Kolkata",
        specialties=["Math & Algorithmic Thinking", "Python"],
        avatar="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
        bio="Master's in Computer Science; loves training kids for competitive coding challenges.",
        active_from_ist="16:00",
        active_to_ist="03:00",
        max_daily_classes=2
    ),
    Mentor(
        id="mentor-7",
        name="Siddharth Rao",
        email="siddharth.rao@codeyoung.com",
        timezone="Asia/Kolkata",
        specialties=["Minecraft Modding", "Python", "Scratch"],
        avatar="https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
        bio="Makes programming exhilarating through Minecraft and game physics simulations.",
        active_from_ist="18:00",
        active_to_ist="05:00",
        max_daily_classes=2
    ),
    Mentor(
        id="mentor-8",
        name="Kavita Nair",
        email="kavita.nair@codeyoung.com",
        timezone="Asia/Kolkata",
        specialties=["Web Development", "UI/UX & Creative Tech"],
        avatar="https://images.unsplash.com/photo-1534751516642-a171ed2ab376?w=150&auto=format&fit=crop&q=80",
        bio="Patient educator dedicated to nurturing confidence in first-time young coders.",
        active_from_ist="18:00",
        active_to_ist="05:00",
        max_daily_classes=2
    ),
    Mentor(
        id="mentor-9",
        name="Aditya Verma",
        email="aditya.verma@codeyoung.com",
        timezone="Asia/Kolkata",
        specialties=["Artificial Intelligence", "Python Projects"],
        avatar="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
        bio="Building the next generation of software innovators with real-world mini-projects.",
        active_from_ist="20:00",
        active_to_ist="07:00",
        max_daily_classes=2
    ),
    Mentor(
        id="mentor-10",
        name="Meera Deshmukh",
        email="meera.deshmukh@codeyoung.com",
        timezone="Asia/Kolkata",
        specialties=["Scratch Junior & Early Logic", "App Inventor"],
        avatar="https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80",
        bio="Early childhood coding specialist turning abstract algorithms into fun games.",
        active_from_ist="20:00",
        active_to_ist="07:00",
        max_daily_classes=2
    )
]

class BookingStore:
    def __init__(self):
        self.mentors: Dict[str, Mentor] = {m.id: m for m in INITIAL_MENTORS}
        self.bookings_collection = db["bookings"]
        self.emails_collection = db["emails"]

        # Restore saved data when the backend starts.
        self.bookings: List[Booking] = [
            Booking.model_validate(doc)
            for doc in self.bookings_collection.find({}, {"_id": 0})
        ]
        self.emails: List[EmailNotification] = [
            EmailNotification.model_validate(doc)
            for doc in self.emails_collection.find({}, {"_id": 0})
        ]

    def get_mentor_daily_bookings_count(self, mentor_id: str, ist_date_str: str) -> int:
        """
        Count how many demo classes a mentor has booked on a specific IST calendar date.
        """
        return sum(
            1 for b in self.bookings
            if b.mentor_id == mentor_id
            and b.mentor_ist_date == ist_date_str
            and b.status == "confirmed"
        )

    def is_mentor_free_at(self, mentor_id: str, utc_dt: datetime) -> bool:
        """
        Checks whether mentor is free for the 1-hour slot starting at utc_dt.
        """
        slot_end = utc_dt + timedelta(hours=1)
        for b in self.bookings:
            if b.mentor_id != mentor_id or b.status != "confirmed":
                continue
            b_start = datetime.fromisoformat(b.utc_start_time)
            b_end = datetime.fromisoformat(b.utc_end_time)
            if max(utc_dt, b_start) < min(slot_end, b_end):
                return False
        return True

    def is_within_working_hours(self, mentor: Mentor, utc_dt: datetime) -> bool:
        """
        Checks if the slot falls within mentor's IST active hours, supporting overnight shifts.
        """
        ist_dt = utc_to_local(utc_dt, mentor.timezone)
        start_h, start_m = map(int, mentor.active_from_ist.split(":"))
        end_h, end_m = map(int, mentor.active_to_ist.split(":"))

        current_time = ist_dt.time()
        start_time = time(start_h, start_m)
        end_time = time(end_h, end_m)

        if start_time <= end_time:
            return start_time <= current_time <= end_time
        else:
            # Shift spans across midnight (e.g. 18:00 to 05:00)
            return current_time >= start_time or current_time <= end_time

    def get_available_mentors_for_slot(self, utc_dt: datetime) -> List[Mentor]:
        available = []
        for mentor in self.mentors.values():
            ist_dt = utc_to_local(utc_dt, mentor.timezone)
            ist_date_str = ist_dt.strftime("%Y-%m-%d")

            if not self.is_within_working_hours(mentor, utc_dt):
                continue

            daily_count = self.get_mentor_daily_bookings_count(mentor.id, ist_date_str)
            if daily_count >= mentor.max_daily_classes:
                continue

            if not self.is_mentor_free_at(mentor.id, utc_dt):
                continue

            available.append(mentor)
        return available

    def assign_best_mentor(self, utc_dt: datetime) -> Optional[Mentor]:
        available = self.get_available_mentors_for_slot(utc_dt)
        if not available:
            return None

        def sort_key(m: Mentor):
            ist_dt = utc_to_local(utc_dt, m.timezone)
            ist_date_str = ist_dt.strftime("%Y-%m-%d")
            daily_count = self.get_mentor_daily_bookings_count(m.id, ist_date_str)
            total_count = sum(1 for b in self.bookings if b.mentor_id == m.id and b.status == "confirmed")
            return (daily_count, total_count)

        available.sort(key=sort_key)
        return available[0]

    def generate_day_slots(self, date_str: str, tz_name: str) -> DaySlotsResponse:
        tz_info = get_timezone_details(tz_name)
        slots: List[SlotInfo] = []

        for hour in range(8, 22):
            time_str = f"{hour:02d}:00"
            utc_dt = local_to_utc(date_str, time_str, tz_name)
            ist_dt = utc_to_local(utc_dt, DEFAULT_MENTOR_TZ)

            diff_days = (ist_dt.date() - datetime.strptime(date_str, "%Y-%m-%d").date()).days
            day_suffix = ""
            if diff_days == 1:
                day_suffix = " (+1d IST)"
            elif diff_days == -1:
                day_suffix = " (-1d IST)"

            ist_friendly = f"{ist_dt.strftime('%I:%M %p').lstrip('0')}{day_suffix}"

            available_mentors = self.get_available_mentors_for_slot(utc_dt)
            is_avail = len(available_mentors) > 0
            reason = None
            if not is_avail:
                working_mentors = [m for m in self.mentors.values() if self.is_within_working_hours(m, utc_dt)]
                if not working_mentors:
                    reason = "Outside mentor working hours"
                else:
                    reason = "All available mentors are fully booked (2 classes/day quota or slot busy)"

            local_fmt = format_datetime_for_tz(utc_dt, tz_name)

            slots.append(SlotInfo(
                time=time_str,
                time_12h=local_fmt["time_12h"],
                utc_iso=utc_dt.isoformat(),
                ist_time=ist_friendly,
                is_available=is_avail,
                available_mentors_count=len(available_mentors),
                unavailability_reason=reason
            ))

        total_available = sum(1 for s in slots if s.is_available)
        return DaySlotsResponse(
            date=date_str,
            timezone=tz_name,
            tz_abbreviation=tz_info["abbreviation"],
            is_dst_active=tz_info["is_dst"],
            offset=tz_info["offset"],
            slots=slots,
            total_slots=len(slots),
            available_slots=total_available
        )

    def create_booking(self, req: BookingRequest) -> Tuple[Optional[Booking], Optional[str]]:
        utc_dt = local_to_utc(req.slot_date, req.slot_time, req.parent_timezone)
        mentor = self.assign_best_mentor(utc_dt)

        if not mentor:
            ist_dt = utc_to_local(utc_dt, DEFAULT_MENTOR_TZ)
            ist_date_str = ist_dt.strftime("%Y-%m-%d")
            total_daily_booked = sum(
                1 for b in self.bookings
                if b.mentor_ist_date == ist_date_str and b.status == "confirmed"
            )
            if total_daily_booked >= 20:
                return None, f"All 10 mentors have reached their maximum quota of 2 trial classes for {ist_date_str} (Total: 20 classes booked). Please choose a different date."
            return None, f"No mentors are available at {req.slot_time} on {req.slot_date} in your timezone ({req.parent_timezone}). All mentors are currently booked or outside active hours. Please choose another time slot."

        booking_id = f"CY-TRIAL-{uuid.uuid4().hex[:8].upper()}"
        room_id = f"demo-room-{uuid.uuid4().hex[:6]}"
        meeting_link = f"http://localhost:8000/live-class?room={room_id}&booking={booking_id}"

        utc_end_dt = utc_dt + timedelta(hours=1)
        parent_fmt = format_datetime_for_tz(utc_dt, req.parent_timezone)
        mentor_fmt = format_datetime_for_tz(utc_dt, mentor.timezone)
        ist_date_str = utc_to_local(utc_dt, mentor.timezone).strftime("%Y-%m-%d")

        booking = Booking(
            id=booking_id,
            parent_name=req.parent_name,
            parent_email=req.parent_email,
            parent_phone=req.parent_phone or "",
            student_name=req.student_name,
            student_age=req.student_age,
            course_interest=req.course_interest,
            mentor_id=mentor.id,
            mentor_name=mentor.name,
            mentor_email=mentor.email,
            utc_start_time=utc_dt.isoformat(),
            utc_end_time=utc_end_dt.isoformat(),
            parent_timezone=req.parent_timezone,
            parent_display_time=f"{parent_fmt['formatted_full']}",
            mentor_timezone=mentor.timezone,
            mentor_display_time=f"{mentor_fmt['formatted_full']}",
            mentor_ist_date=ist_date_str,
            demo_meeting_link=meeting_link,
            created_at=datetime.now(ZoneInfo("UTC")).isoformat(),
            status="confirmed"
        )
        # Save the booking in MongoDB first, then update the in-memory cache.
        self.bookings_collection.insert_one(booking.model_dump())
        self.bookings.append(booking)

        # Email failures are logged and do not undo the successful booking.
        self._dispatch_emails(booking, mentor, parent_fmt, mentor_fmt)
        return booking, None

    def _dispatch_emails(
        self,
        booking: Booking,
        mentor: Mentor,
        parent_fmt: Dict[str, str],
        mentor_fmt: Dict[str, str],
    ):
        """Create email log records and attempt to send both real emails."""
        now_str = datetime.now(ZoneInfo("UTC")).isoformat()

        parent_email_body = f"""
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:auto">
          <div style="background:#4f46e5;color:white;padding:20px;text-align:center">
            <h1>Trial Class Confirmed with Codeyoung!</h1>
          </div>
          <div style="padding:24px">
            <p>Dear <strong>{booking.parent_name}</strong>,</p>
            <p>We are happy to welcome <strong>{booking.student_name}</strong> (age {booking.student_age}) to a trial class in <strong>{booking.course_interest}</strong>.</p>
            <p><strong>Your local class time:</strong> {booking.parent_display_time}</p>
            <p><strong>Assigned mentor:</strong> {mentor.name}</p>
            <p><strong>Duration:</strong> 60 minutes</p>
            <p><strong>Booking ID:</strong> {booking.id}</p>
            <p><a href="{booking.demo_meeting_link}">Join the live class demo room</a></p>
            <p>Please use a laptop or desktop with a working microphone and webcam.</p>
          </div>
        </div>
        """

        mentor_email_body = f"""
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:auto">
          <div style="background:#059669;color:white;padding:20px;text-align:center">
            <h1>New Trial Class Assigned</h1>
          </div>
          <div style="padding:24px">
            <p>Hello <strong>{mentor.name}</strong>,</p>
            <p>A new trial class has been scheduled and assigned to you.</p>
            <p><strong>Your class time:</strong> {booking.mentor_display_time}</p>
            <p><strong>Student local time:</strong> {booking.parent_display_time} ({booking.parent_timezone})</p>
            <p><strong>Student:</strong> {booking.student_name} (age {booking.student_age})</p>
            <p><strong>Subject:</strong> {booking.course_interest}</p>
            <p><strong>Parent:</strong> {booking.parent_name} ({booking.parent_email})</p>
            <p><strong>Booking ID:</strong> {booking.id}</p>
            <p><a href="{booking.demo_meeting_link}">Enter the mentor live classroom</a></p>
          </div>
        </div>
        """

        new_emails = [
            EmailNotification(
                id=f"EMAIL-{uuid.uuid4().hex[:6].upper()}",
                booking_id=booking.id,
                recipient_email=booking.parent_email,
                recipient_role="parent",
                recipient_name=booking.parent_name,
                subject=f"Confirmed: {booking.student_name}'s Trial Class in {booking.course_interest}",
                body_html=parent_email_body,
                sent_at=now_str,
            ),
            EmailNotification(
                id=f"EMAIL-{uuid.uuid4().hex[:6].upper()}",
                booking_id=booking.id,
                recipient_email=os.getenv("MENTOR_NOTIFICATION_EMAIL", mentor.email).strip() or mentor.email,
                recipient_role="mentor",
                recipient_name=mentor.name,
                subject=f"New Demo Class: {booking.student_name} on {mentor_fmt['date']}",
                body_html=mentor_email_body,
                sent_at=now_str,
            ),
        ]

        # Keep an email log in memory and MongoDB even if SMTP sending fails.
        self.emails.extend(new_emails)
        try:
            self.emails_collection.insert_many([email.model_dump() for email in new_emails])
        except Exception:
            logger.exception("Could not save email log records to MongoDB for booking %s", booking.id)

        for email in new_emails:
            sent = send_email(
                to_email=email.recipient_email,
                subject=email.subject,
                html_body=email.body_html,
            )
            if sent:
                logger.info("Booking email accepted by Gmail for %s", email.recipient_email)
            else:
                logger.error(
                    "Booking %s was saved, but email to %s failed. Check EMAIL_ADDRESS, "
                    "EMAIL_APP_PASSWORD, and the SMTP error above.",
                    booking.id,
                    email.recipient_email,
                )

booking_store = BookingStore()
