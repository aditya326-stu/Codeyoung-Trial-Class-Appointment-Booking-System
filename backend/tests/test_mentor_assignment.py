import pytest
from datetime import datetime
from app.mentor_service import BookingStore
from app.models import BookingRequest

def test_initial_mentors_count():
    store = BookingStore()
    assert len(store.mentors) == 10
    for mentor in store.mentors.values():
        assert mentor.max_daily_classes == 2
        assert mentor.timezone == "Asia/Kolkata"

def test_mentor_max_two_classes_per_day():
    store = BookingStore()
    date_str = "2026-10-15"

    mentor_1 = list(store.mentors.values())[0]

    for h in [10, 11]:
        req = BookingRequest(
            parent_name="John Doe",
            parent_email="john@example.com",
            student_name=f"Kid {h}",
            student_age=10,
            course_interest="Python for Kids",
            parent_timezone="Asia/Kolkata",
            slot_date=date_str,
            slot_time=f"{h}:00"
        )
        booking, err = store.create_booking(req)
        assert err is None
        assert booking is not None

    count = store.get_mentor_daily_bookings_count(mentor_1.id, date_str)
    assert count <= 2

def test_full_system_capacity_20_classes_per_day():
    store = BookingStore()
    date_str = "2026-10-20"

    # Exactly 20 bookings across the day matching mentor active hours (10 mentors * 2 max classes = 20)
    # Pairs of slots for concurrent mentors:
    # 10:00 & 11:00 (Mentors 1 & 2) -> 4 bookings
    # 12:00 & 13:00 (Mentor 3) -> 2 bookings
    # 14:00 & 15:00 (Mentor 4) -> 2 bookings
    # 16:00 & 17:00 (Mentors 5 & 6) -> 4 bookings
    # 18:00 & 19:00 (Mentors 7 & 8) -> 4 bookings
    # 20:00 & 21:00 (Mentors 9 & 10) -> 4 bookings
    # Total = 4 + 2 + 2 + 4 + 4 + 4 = 20 bookings!
    slots = [
        "10:00", "10:00", "11:00", "11:00",
        "12:00", "13:00",
        "14:00", "15:00",
        "16:00", "16:00", "17:00", "17:00",
        "18:00", "18:00", "19:00", "19:00",
        "20:00", "20:00", "21:00", "21:00"
    ]
    successful_bookings = 0
    for i, slot_time in enumerate(slots):
        req = BookingRequest(
            parent_name=f"Parent {i+1}",
            parent_email=f"parent{i+1}@example.com",
            student_name=f"Student {i+1}",
            student_age=9,
            course_interest="Scratch",
            parent_timezone="Asia/Kolkata",
            slot_date=date_str,
            slot_time=slot_time
        )
        booking, err = store.create_booking(req)
        if booking:
            successful_bookings += 1

    assert successful_bookings == 20
    assert len(store.bookings) == 20

    # 21st booking on the same date must fail gracefully with error state
    overflow_req = BookingRequest(
        parent_name="Overflow Parent",
        parent_email="overflow@example.com",
        student_name="Overflow Student",
        student_age=11,
        course_interest="Python",
        parent_timezone="Asia/Kolkata",
        slot_date=date_str,
        slot_time="14:00"
    )
    overflow_booking, err = store.create_booking(overflow_req)
    assert overflow_booking is None
    assert err is not None
    assert "All 10 mentors have reached their maximum quota" in err or "No mentors are available" in err

def test_email_notifications_generation():
    store = BookingStore()
    req = BookingRequest(
        parent_name="Sarah Jenkins",
        parent_email="sarah.j@example.com",
        student_name="Timmy Jenkins",
        student_age=10,
        course_interest="Game Design & Scratch",
        parent_timezone="America/New_York",
        slot_date="2026-10-16",
        slot_time="10:00"
    )
    booking, err = store.create_booking(req)
    assert err is None
    assert booking is not None

    assert len(store.emails) == 2
    parent_email = next(e for e in store.emails if e.recipient_role == "parent")
    mentor_email = next(e for e in store.emails if e.recipient_role == "mentor")

    assert parent_email.recipient_email == "sarah.j@example.com"
    assert "Timmy Jenkins" in parent_email.subject
    assert booking.demo_meeting_link in parent_email.body_html
    assert "Your Local Time:" in parent_email.body_html

    assert mentor_email.recipient_email == booking.mentor_email
    assert "Your Class Time (IST):" in mentor_email.body_html
    assert "Student's Local Time:" in mentor_email.body_html
