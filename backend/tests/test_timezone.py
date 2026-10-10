import pytest
from datetime import datetime
from zoneinfo import ZoneInfo
from app.timezone_utils import (
    local_to_utc,
    utc_to_local,
    get_timezone_details,
    format_datetime_for_tz
)

def test_timezone_dst_summer_vs_winter():
    # US Eastern in Summer (July 15 - EDT is UTC-4)
    summer_dt = datetime(2026, 7, 15, 12, 0, tzinfo=ZoneInfo("UTC"))
    ny_summer = get_timezone_details("America/New_York", summer_dt)
    assert ny_summer["is_dst"] is True
    assert ny_summer["offset"] == "UTC-04:00"
    assert ny_summer["abbreviation"] == "EDT"

    # US Eastern in Winter (January 15 - EST is UTC-5)
    winter_dt = datetime(2026, 1, 15, 12, 0, tzinfo=ZoneInfo("UTC"))
    ny_winter = get_timezone_details("America/New_York", winter_dt)
    assert ny_winter["is_dst"] is False
    assert ny_winter["offset"] == "UTC-05:00"
    assert ny_winter["abbreviation"] == "EST"

def test_uk_dst_bst_vs_gmt():
    # UK in Summer (July - BST is UTC+1)
    summer_dt = datetime(2026, 7, 15, 12, 0, tzinfo=ZoneInfo("UTC"))
    uk_summer = get_timezone_details("Europe/London", summer_dt)
    assert uk_summer["is_dst"] is True
    assert uk_summer["offset"] == "UTC+01:00"
    assert uk_summer["abbreviation"] == "BST"

    # UK in Winter (January - GMT is UTC+0)
    winter_dt = datetime(2026, 1, 15, 12, 0, tzinfo=ZoneInfo("UTC"))
    uk_winter = get_timezone_details("Europe/London", winter_dt)
    assert uk_winter["is_dst"] is False
    assert uk_winter["offset"] == "UTC+00:00"
    assert uk_winter["abbreviation"] == "GMT"

def test_india_no_dst():
    # India IST is always UTC+5:30 with no DST
    summer_dt = datetime(2026, 7, 15, 12, 0, tzinfo=ZoneInfo("UTC"))
    ist_summer = get_timezone_details("Asia/Kolkata", summer_dt)
    assert ist_summer["is_dst"] is False
    assert ist_summer["offset"] == "UTC+05:30"
    assert ist_summer["abbreviation"] == "IST"

def test_local_to_utc_conversion():
    # 5:00 PM EDT on July 10, 2026 -> 9:00 PM UTC
    utc_dt = local_to_utc("2026-07-10", "17:00", "America/New_York")
    assert utc_dt.hour == 21
    assert utc_dt.day == 10

    # Convert to IST (UTC+5:30) -> Next day 2:30 AM IST on July 11
    ist_dt = utc_to_local(utc_dt, "Asia/Kolkata")
    assert ist_dt.hour == 2
    assert ist_dt.minute == 30
    assert ist_dt.day == 11
