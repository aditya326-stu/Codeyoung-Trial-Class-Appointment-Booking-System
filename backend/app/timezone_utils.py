"""
Timezone and Daylight Saving Time (DST) Utility Module.
Handles timezone conversions, DST detection, and slot generation
across US, UK, India (IST), and UTC.
"""

from datetime import datetime, date, time, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from typing import List, Dict, Any, Optional

SUPPORTED_TIMEZONES = [
    {
        "id": "America/New_York",
        "label": "US Eastern Time (ET - New York, Atlanta, Miami)",
        "region": "US"
    },
    {
        "id": "America/Chicago",
        "label": "US Central Time (CT - Chicago, Dallas, Houston)",
        "region": "US"
    },
    {
        "id": "America/Denver",
        "label": "US Mountain Time (MT - Denver, Salt Lake City)",
        "region": "US"
    },
    {
        "id": "America/Los_Angeles",
        "label": "US Pacific Time (PT - Los Angeles, San Francisco, Seattle)",
        "region": "US"
    },
    {
        "id": "Europe/London",
        "label": "UK Time (GMT / BST - London)",
        "region": "UK"
    },
    {
        "id": "Asia/Kolkata",
        "label": "India Standard Time (IST - Bengaluru, New Delhi)",
        "region": "India"
    },
    {
        "id": "UTC",
        "label": "Coordinated Universal Time (UTC)",
        "region": "Global"
    }
]

DEFAULT_MENTOR_TZ = "Asia/Kolkata"

def get_zone_info(tz_name: str) -> ZoneInfo:
    try:
        return ZoneInfo(tz_name)
    except (ZoneInfoNotFoundError, ValueError):
        return ZoneInfo("UTC")

def get_timezone_details(tz_name: str, ref_dt: Optional[datetime] = None) -> Dict[str, Any]:
    """
    Returns timezone offset, DST status, and friendly abbreviation for a given reference date.
    """
    tz = get_zone_info(tz_name)
    if ref_dt is None:
        ref_dt = datetime.now(ZoneInfo("UTC"))
    elif ref_dt.tzinfo is None:
        ref_dt = ref_dt.replace(tzinfo=ZoneInfo("UTC"))

    localized = ref_dt.astimezone(tz)
    offset = localized.utcoffset() or timedelta(0)
    total_seconds = int(offset.total_seconds())
    sign = "+" if total_seconds >= 0 else "-"
    hours = abs(total_seconds) // 3600
    minutes = (abs(total_seconds) % 3600) // 60
    offset_str = f"UTC{sign}{hours:02d}:{minutes:02d}"

    # Check DST: dst() returns non-zero timedelta if daylight saving time is active
    dst_offset = localized.dst()
    is_dst = bool(dst_offset and dst_offset.total_seconds() != 0)
    abbr = localized.tzname() or tz_name

    return {
        "timezone": tz_name,
        "abbreviation": abbr,
        "offset": offset_str,
        "offset_minutes": total_seconds // 60,
        "is_dst": is_dst,
        "local_time_iso": localized.isoformat()
    }

def local_to_utc(date_str: str, time_str: str, tz_name: str) -> datetime:
    """
    Converts a local date (YYYY-MM-DD) and time (HH:MM) in tz_name to a timezone-aware UTC datetime.
    Correctly accounts for DST.
    """
    tz = get_zone_info(tz_name)
    year, month, day = map(int, date_str.split("-"))
    hour, minute = map(int, time_str.split(":"))
    local_dt = datetime(year, month, day, hour, minute, tzinfo=tz)
    return local_dt.astimezone(ZoneInfo("UTC"))

def utc_to_local(utc_dt: datetime, tz_name: str) -> datetime:
    """
    Converts a UTC datetime to localized datetime in tz_name.
    """
    if utc_dt.tzinfo is None:
        utc_dt = utc_dt.replace(tzinfo=ZoneInfo("UTC"))
    tz = get_zone_info(tz_name)
    return utc_dt.astimezone(tz)

def format_datetime_for_tz(utc_dt: datetime, tz_name: str) -> Dict[str, str]:
    """
    Returns formatted representations for display (e.g. 5:00 PM EDT, Oct 10, 2026).
    """
    loc_dt = utc_to_local(utc_dt, tz_name)
    abbr = loc_dt.tzname() or ""
    return {
        "date": loc_dt.strftime("%Y-%m-%d"),
        "date_friendly": loc_dt.strftime("%A, %B %d, %Y"),
        "time": loc_dt.strftime("%H:%M"),
        "time_12h": loc_dt.strftime("%I:%M %p").lstrip("0"),
        "formatted_full": f"{loc_dt.strftime('%A, %b %d, %Y at %I:%M %p').lstrip('0')} {abbr}".strip(),
        "tz_abbr": abbr,
        "iso": loc_dt.isoformat()
    }
