@echo off
echo Cleaning cache...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
rd /s /q .next 2>nul
rd /s /q node_modules\.cache 2>nul
del /f tsconfig.tsbuildinfo 2>nul
echo Cache cleaned!
echo Starting dev server...
npm run dev
