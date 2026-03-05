# Clean and Restart Script for Unytea
Write-Host "🧹 Cleaning Unytea project..." -ForegroundColor Cyan

# Stop any running Node processes
Write-Host "`n1️⃣ Stopping Node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Remove .next cache
Write-Host "`n2️⃣ Removing .next cache..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "   ✅ .next removed" -ForegroundColor Green
} else {
    Write-Host "   ℹ️ No .next folder found" -ForegroundColor Gray
}

# Remove node_modules/.cache
Write-Host "`n3️⃣ Removing node_modules cache..." -ForegroundColor Yellow
if (Test-Path "node_modules/.cache") {
    Remove-Item -Recurse -Force "node_modules/.cache"
    Write-Host "   ✅ node_modules/.cache removed" -ForegroundColor Green
} else {
    Write-Host "   ℹ️ No cache folder found" -ForegroundColor Gray
}

# Remove tsconfig.tsbuildinfo
Write-Host "`n4️⃣ Removing TypeScript build info..." -ForegroundColor Yellow
if (Test-Path "tsconfig.tsbuildinfo") {
    Remove-Item -Force "tsconfig.tsbuildinfo"
    Write-Host "   ✅ tsconfig.tsbuildinfo removed" -ForegroundColor Green
} else {
    Write-Host "   ℹ️ No build info found" -ForegroundColor Gray
}

Write-Host "`n✨ Cleanup complete!" -ForegroundColor Green
Write-Host "`n🚀 Starting development server..." -ForegroundColor Cyan
Write-Host "───────────────────────────────────────" -ForegroundColor Gray

# Start dev server
npm run dev
