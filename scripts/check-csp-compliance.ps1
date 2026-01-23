# CSP Compliance Checker
# Run this script to identify potential CSP issues before deployment

Write-Host "🛡️  CSP Compliance Checker" -ForegroundColor Cyan
Write-Host "=" * 50

# Check 1: Search for vercel.app references
Write-Host "`n1️⃣  Checking for vercel.app references..." -ForegroundColor Yellow
$vercelRefs = Get-ChildItem -Path . -Recurse -Include *.ts,*.tsx,*.js,*.jsx,*.mjs -Exclude node_modules | 
    Select-String -Pattern "vercel\.app" -CaseSensitive

if ($vercelRefs) {
    Write-Host "⚠️  Found vercel.app references:" -ForegroundColor Red
    $vercelRefs | ForEach-Object {
        Write-Host "   $($_.Path):$($_.LineNumber) - $($_.Line.Trim())" -ForegroundColor Red
    }
    Write-Host "   Action: Replace with process.env.NEXT_PUBLIC_APP_URL" -ForegroundColor Yellow
} else {
    Write-Host "✅ No vercel.app references found" -ForegroundColor Green
}

# Check 2: Search for inline scripts without nonce
Write-Host "`n2️⃣  Checking for inline scripts..." -ForegroundColor Yellow
$inlineScripts = Get-ChildItem -Path ./app,./components -Recurse -Include *.tsx,*.jsx -ErrorAction SilentlyContinue |
    Select-String -Pattern "<script[^>]*>" -CaseSensitive

if ($inlineScripts) {
    Write-Host "⚠️  Found potential inline scripts (verify they use CSPScript):" -ForegroundColor Yellow
    $inlineScripts | Select-Object -First 10 | ForEach-Object {
        Write-Host "   $($_.Path):$($_.LineNumber)" -ForegroundColor Yellow
    }
    Write-Host "   Action: Use <CSPInlineScript> or <CSPScript> instead" -ForegroundColor Yellow
} else {
    Write-Host "✅ No inline scripts found (or all use CSP components)" -ForegroundColor Green
}

# Check 3: Verify environment variables
Write-Host "`n3️⃣  Checking environment variables..." -ForegroundColor Yellow
if (Test-Path .env.local) {
    $envContent = Get-Content .env.local
    
    # Check NEXT_PUBLIC_APP_URL
    $appUrl = $envContent | Select-String -Pattern "^NEXT_PUBLIC_APP_URL="
    if ($appUrl) {
        Write-Host "✅ NEXT_PUBLIC_APP_URL is set: $appUrl" -ForegroundColor Green
        if ($appUrl -match "vercel\.app") {
            Write-Host "⚠️  Warning: NEXT_PUBLIC_APP_URL points to vercel.app" -ForegroundColor Yellow
            Write-Host "   Action: Update to your custom domain" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ NEXT_PUBLIC_APP_URL is not set in .env.local" -ForegroundColor Red
        Write-Host "   Action: Add NEXT_PUBLIC_APP_URL=https://www.unytea.com" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  .env.local not found (using .env.example?)" -ForegroundColor Yellow
}

# Check 4: Verify CSP files exist
Write-Host "`n4️⃣  Checking CSP implementation files..." -ForegroundColor Yellow
$cspFiles = @(
    "lib/csp.ts",
    "components/csp-script.tsx",
    "middleware.ts"
)

foreach ($file in $cspFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file exists" -ForegroundColor Green
    } else {
        Write-Host "❌ $file is missing" -ForegroundColor Red
    }
}

# Check 5: Look for hardcoded URLs
Write-Host "`n5️⃣  Checking for hardcoded URLs..." -ForegroundColor Yellow
$hardcodedUrls = Get-ChildItem -Path ./app,./components,./lib -Recurse -Include *.ts,*.tsx -ErrorAction SilentlyContinue |
    Select-String -Pattern "https?://[a-zA-Z0-9\-\.]+\.(com|io|net)" -CaseSensitive

if ($hardcodedUrls) {
    $uniqueUrls = $hardcodedUrls.Line | ForEach-Object {
        if ($_ -match "(https?://[a-zA-Z0-9\-\.]+\.(com|io|net))") {
            $matches[1]
        }
    } | Select-Object -Unique | Where-Object { $_ -notmatch "(uploadthing|livekit|youtube|vimeo)" }
    
    if ($uniqueUrls) {
        Write-Host "⚠️  Found hardcoded URLs (verify they're in CSP):" -ForegroundColor Yellow
        $uniqueUrls | ForEach-Object {
            Write-Host "   $_" -ForegroundColor Yellow
        }
        Write-Host "   Action: Verify these domains are in lib/csp.ts" -ForegroundColor Yellow
    } else {
        Write-Host "✅ No unexpected hardcoded URLs found" -ForegroundColor Green
    }
}

# Summary
Write-Host "`n" + ("=" * 50)
Write-Host "✅ CSP Compliance Check Complete" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor White
Write-Host "1. Fix any ❌ or ⚠️  issues above" -ForegroundColor White
Write-Host "2. Run 'npm run dev' and check DevTools console for CSP errors" -ForegroundColor White
Write-Host "3. Test with CSP Report-Only mode first (see CSP_IMPLEMENTATION_GUIDE.md)" -ForegroundColor White
Write-Host "4. Deploy to production when no violations are found" -ForegroundColor White
