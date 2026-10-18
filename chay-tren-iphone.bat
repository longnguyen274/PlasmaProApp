@echo off
rem Mo Metro cho Expo Go. Nhap dup tep nay; khong can go duong dan.
rem Neu mang chan ket noi giua cac may: chay "chay-tren-iphone.bat tunnel"
cd /d "%~dp0"
if not exist node_modules call npm install
if /i "%1"=="tunnel" (
  call npx expo start --tunnel
) else (
  call npx expo start
)
pause
