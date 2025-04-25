@echo off
docker run --env-file .env -p 3000:3000 audioreminder/audioreminder:latest
timeout /t 3 >nul
start http://localhost:3000