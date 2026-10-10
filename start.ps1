$env:PYTHONPATH = "backend"
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting Codeyoung Trial Booking System at http://localhost:8000" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
.\backend\.venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
