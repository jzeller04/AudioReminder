@echo off
echo Installing dependencies...
powershell -Command "Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass"
npm install
echo Installation complete!
pause