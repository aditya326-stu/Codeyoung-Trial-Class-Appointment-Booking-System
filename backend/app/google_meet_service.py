
import time
import uuid
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

PROJECT_ROOT = Path(__file__).resolve().parents[2]
TOKEN_FILE = PROJECT_ROOT / "gmail_token.json"

SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/calendar.events",
]


def create_google_meet(booking):
    credentials = Credentials.from_authorized_user_file(
        str(TOKEN_FILE), SCOPES
    )

    if credentials.expired and credentials.refresh_token:
        credentials.refresh(Request())
        TOKEN_FILE.write_text(
            credentials.to_json(), encoding="utf-8"
        )

    if not credentials.valid:
        raise RuntimeError("Google authorization is invalid.")

    service = build(
        "calendar",
        "v3",
        credentials=credentials,
        cache_discovery=False,
    )

    event = {
        "summary": (
            f"CodeYoung Trial Class - {booking.student_name}"
        ),
        "description": (
            f"Course: {booking.course_interest}\n"
            f"Mentor: {booking.mentor_name}\n"
            f"Booking ID: {booking.id}"
        ),
        "start": {
            "dateTime": booking.utc_start_time,
        },
        "end": {
            "dateTime": booking.utc_end_time,
        },
        "conferenceData": {
            "createRequest": {
                "requestId": uuid.uuid4().hex,
                "conferenceSolutionKey": {
                    "type": "hangoutsMeet"
                },
            }
        },
    }

    created = service.events().insert(
        calendarId="primary",
        body=event,
        conferenceDataVersion=1,
    ).execute()

    event_id = created["id"]

    # Meet conference creation is asynchronous.
    # Check briefly for the actual video meeting URL.
    for _ in range(10):
        details = service.events().get(
            calendarId="primary",
            eventId=event_id,
        ).execute()

        conference = details.get("conferenceData", {})
        status = conference.get("createRequest", {}).get(
            "status", {}
        ).get("statusCode")

        for entry in conference.get("entryPoints", []):
            if (
                entry.get("entryPointType") == "video"
                and entry.get("uri")
            ):
                return entry["uri"]

        if status == "failure":
            break

        time.sleep(1)

    raise RuntimeError(
        "Google Meet link was not generated. "
        "The Calendar event may already exist; check Google Calendar."
    )
