@echo off
set PYTHONPATH=backend
echo ==========================================================
echo Starting Codeyoung Trial Booking System at http://localhost:8000
echo ==========================================================
.\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
