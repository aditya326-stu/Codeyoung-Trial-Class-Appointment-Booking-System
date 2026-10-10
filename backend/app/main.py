from fastapi import WebSocket, WebSocketDisconnect
import asyncio
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from datetime import datetime
import os
from typing import List, Optional

from app.models import (
    Mentor,
    BookingRequest,
    Booking,
    EmailNotification,
    DaySlotsResponse
)
from app.timezone_utils import (
    SUPPORTED_TIMEZONES,
    get_timezone_details,
    format_datetime_for_tz
)
from app.mentor_service import booking_store

app = FastAPI(
    title="Codeyoung Trial Class Appointment Booking System",
    description="Cross-timezone trial class scheduling with DST handling and 10-mentor load balancing",
    version="1.0.0"
)

# Enable CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "system_time_utc": datetime.utcnow().isoformat(),
        "total_mentors": len(booking_store.mentors),
        "total_bookings": len(booking_store.bookings)
    }

@app.get("/api/timezones")
def get_timezones():
    """
    Returns supported parent & mentor timezones with live DST status and offsets.
    """
    now_utc = datetime.now()
    results = []
    for tz_item in SUPPORTED_TIMEZONES:
        details = get_timezone_details(tz_item["id"], now_utc)
        results.append({
            **tz_item,
            **details
        })
    return results

@app.get("/api/slots", response_model=DaySlotsResponse)
def get_slots(
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    timezone: str = Query("America/New_York", description="Parent IANA timezone")
):
    """
    Returns available time slots in parent local timezone for the specified date,
    checking mentor availability, working hours, and the max 2 classes/day/mentor limit.
    """
    try:
        # Validate date format
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")

    return booking_store.generate_day_slots(date, timezone)

@app.post("/api/bookings", response_model=Booking)
def create_booking(req: BookingRequest):
    """
    Books a trial class and assigns an available mentor adhering to the 2 classes/day rule.
    """
    booking, error = booking_store.create_booking(req)
    if error:
        raise HTTPException(status_code=409, detail=error)
    return booking

@app.get("/api/bookings", response_model=List[Booking])
def get_bookings():
    """
    Returns all booked trial classes.
    """
    return booking_store.bookings

@app.get("/api/mentors")
def get_mentors(ist_date: Optional[str] = Query(None, description="Optional IST date YYYY-MM-DD to check daily quota")):
    """
    Returns list of 10 mentors and their current daily booked class counts.
    """
    if not ist_date:
        ist_date = datetime.now().strftime("%Y-%m-%d")

    mentor_list = []
    for m in booking_store.mentors.values():
        daily_count = booking_store.get_mentor_daily_bookings_count(m.id, ist_date)
        mentor_list.append({
            **m.model_dump(),
            "daily_booked_classes": daily_count,
            "max_daily_classes": m.max_daily_classes,
            "is_at_capacity": daily_count >= m.max_daily_classes,
            "checked_ist_date": ist_date
        })
    return {
        "ist_date": ist_date,
        "total_system_capacity_for_day": len(booking_store.mentors) * 2,
        "total_booked_for_day": sum(m["daily_booked_classes"] for m in mentor_list),
        "mentors": mentor_list
    }

@app.get("/api/emails", response_model=List[EmailNotification])
def get_emails():
    """
    Returns email log records created for parents and mentors. SMTP delivery status is reported in the backend terminal.
    """
    return list(reversed(booking_store.emails))

@app.get("/api/class/{room_id}")
def get_class_room(room_id: str, booking_id: Optional[str] = None):
    """
    Provides metadata for the live virtual demo classroom.
    """
    booking = None
    if booking_id:
        booking = next((b for b in booking_store.bookings if b.id == booking_id), None)
    
    return {
        "room_id": room_id,
        "booking": booking,
        "is_active": True,
        "room_features": [
            "1-on-1 HD Video & Audio",
            "Interactive Code & Scratch Canvas",
            "Screen Sharing",
            "In-class Real-time Chat",
            "Live Mentor Feedback"
        ]
    }

@app.post("/api/seed-mock-bookings")
def seed_mock_bookings(date: str = "2026-10-15", count: int = 18):
    """
    Test helper endpoint to seed mock bookings for testing capacity limits (e.g. 18 or 20 bookings).
    """
    import random
    names = ["Emily Watson", "Oliver Smith", "Sophia Johnson", "Liam Davis", "Ava Brown", 
             "Noah Wilson", "Isabella Taylor", "Lucas Anderson", "Mia Thomas", "Ethan Jackson",
             "Charlotte White", "James Harris", "Amelia Martin", "Benjamin Clark", "Harper Lewis",
             "Alexander Lee", "Evelyn Walker", "Daniel Hall", "Emma Allen", "Henry Young"]
    courses = ["Python for Kids", "Scratch & Game Dev", "Robotics & Web Development", "Minecraft Modding", "AI for Kids"]
    tzs = ["America/New_York", "America/Chicago", "America/Los_Angeles", "Europe/London"]
    
    created = 0
    errors = []
    
    for i in range(min(count, len(names))):
        hour = 9 + (i % 11)
        req = BookingRequest(
            parent_name=f"Parent of {names[i]}",
            parent_email=f"parent.{i+1}@example.com",
            student_name=names[i],
            student_age=8 + (i % 6),
            course_interest=courses[i % len(courses)],
            parent_timezone=tzs[i % len(tzs)],
            slot_date=date,
            slot_time=f"{hour:02d}:00"
        )
        b, err = booking_store.create_booking(req)
        if b:
            created += 1
        else:
            errors.append(err)
            
    return {
        "requested": count,
        "created": created,
        "total_now": len(booking_store.bookings),
        "errors": errors
    }

@app.post("/api/reset")
def reset_store():
    """
    Resets all bookings and emails for a clean demo state.
    """
    booking_store.bookings_collection.delete_many({})
    booking_store.emails_collection.delete_many({})
    booking_store.bookings.clear()
    booking_store.emails.clear()
    return {"message": "All bookings and emails have been reset successfully."}

# Mount static frontend build if present
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public"))
if os.path.exists(frontend_dist):
    app.mount("/static", StaticFiles(directory=frontend_dist), name="static")

    @app.get("/")
    @app.get("/live-class")
    @app.get("/mentors")
    @app.get("/emails")
    def serve_frontend_spa():
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "Frontend index.html not found. Please build frontend."}


# WebSocket signaling for live classroom peers. Registered on the same FastAPI app.
class ClassroomSignaling:
    def __init__(self):
        self.rooms = {}
        self.lock = asyncio.Lock()

    async def connect(self, room_id: str, websocket: WebSocket):
        await websocket.accept()
        async with self.lock:
            peers = self.rooms.setdefault(room_id, set())
            existing_peers = list(peers)
            peers.add(websocket)
        await websocket.send_json({"type": "room-state", "peer_present": bool(existing_peers)})
        await self.broadcast(room_id, {"type": "peer-joined"}, exclude=websocket)

    async def broadcast(self, room_id: str, message: dict, exclude=None):
        async with self.lock:
            peers = list(self.rooms.get(room_id, set()))
        for peer in peers:
            if peer is exclude:
                continue
            try:
                await peer.send_json(message)
            except Exception:
                pass

    async def disconnect(self, room_id: str, websocket: WebSocket):
        async with self.lock:
            peers = self.rooms.get(room_id, set())
            peers.discard(websocket)
            if not peers:
                self.rooms.pop(room_id, None)
        await self.broadcast(room_id, {"type": "peer-left"}, exclude=websocket)


classroom_signaling = ClassroomSignaling()


@app.websocket("/ws/classroom/{room_id}")
async def classroom_websocket(websocket: WebSocket, room_id: str):
    if not room_id or len(room_id) > 128:
        await websocket.close(code=1008)
        return
    await classroom_signaling.connect(room_id, websocket)
    try:
        while True:
            message = await websocket.receive_json()
            if not isinstance(message, dict) or message.get("type") not in {"offer", "answer", "ice-candidate"}:
                continue
            await classroom_signaling.broadcast(room_id, message, exclude=websocket)
    except WebSocketDisconnect:
        pass
    finally:
        await classroom_signaling.disconnect(room_id, websocket)
