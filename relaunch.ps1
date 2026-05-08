Write-Host "Starting FoodRescue AI Platform..." -ForegroundColor Cyan

# Start Backend Server
Write-Host "1. Booting Node.js Backend Server (Port 5000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -NoExit -Command `"cd backend; node server.js`""

# Start ML API (Flask)
Write-Host "2. Booting Python ML API (Port 5001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -NoExit -Command `"cd ml_api; .\venv\Scripts\activate; python app.py`""

# Start Frontend (HTTP Server)
Write-Host "3. Booting Frontend Web Server (Port 8080)..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -NoExit -Command `"cd frontend; python -m http.server 8080`""

# Start Admin Dashboard (Streamlit)
Write-Host "4. Booting Admin Dashboard Streamlit App (Port 8501)..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -NoExit -Command `"cd admin_app; pip install -r requirements.txt; python -m streamlit run app.py`""

Write-Host "=========================================="
Write-Host "Success! Four new terminal windows have been launched for each service." -ForegroundColor Green
Write-Host "Please open your browser and navigate to: http://localhost:8080/login.html" -ForegroundColor DarkYellow
Write-Host "Admin users should navigate to: http://localhost:8501" -ForegroundColor Magenta
Write-Host "=========================================="
