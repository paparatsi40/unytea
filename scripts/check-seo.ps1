# SEO Verification Script
# Run this to verify SEO implementation

Write-Host "🔍 SEO Implementation Checker" -ForegroundColor Cyan
Write-Host "=" * 50

# Check 1: Sitemap file exists
Write-Host "`n1️⃣  Checking sitemap.ts..." -ForegroundColor Yellow
if (Test-Path "app/sitemap.ts") {
    Write-Host "✅ Sitemap file exists" -ForegroundColor Green
} else {
    Write-Host "❌ Sitemap file missing" -ForegroundColor Red
}

# Check 2: Robots file exists
Write-Host "`n2️⃣  Checking robots.ts..." -ForegroundColor Yellow
if (Test-Path "app/robots.ts") {
    Write-Host "✅ Robots file exists" -ForegroundColor Green
} else {
    Write-Host "❌ Robots file missing" -ForegroundColor Red
}

# Check 3: SEO helper exists
Write-Host "`n3️⃣  Checking SEO helper..." -ForegroundColor Yellow
if (Test-Path "lib/seo.ts") {
    Write-Host "✅ SEO helper exists" -ForegroundColor Green
} else {
    Write-Host "❌ SEO helper missing" -ForegroundColor Red
}

# Check 4: Structured data components
Write-Host "`n4️⃣  Checking structured data..." -ForegroundColor Yellow
if (Test-Path "components/seo/structured-data.tsx") {
    Write-Host "✅ Structured data components exist" -ForegroundColor Green
} else {
    Write-Host "❌ Structured data missing" -ForegroundColor Red
}

# Check 5: Web manifest
Write-Host "`n5️⃣  Checking web manifest..." -ForegroundColor Yellow
if (Test-Path "public/site.webmanifest") {
    Write-Host "✅ Web manifest exists" -ForegroundColor Green
    
    $manifest = Get-Content "public/site.webmanifest" -Raw | ConvertFrom-Json
    if ($manifest.name -and $manifest.name -ne "") {
        Write-Host "   Name: $($manifest.name)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Manifest name is empty" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Web manifest missing" -ForegroundColor Red
}

# Check 6: Environment variable
Write-Host "`n6️⃣  Checking NEXT_PUBLIC_APP_URL..." -ForegroundColor Yellow
if (Test-Path ".env.local") {
    $envContent = Get-Content ".env.local"
    $appUrl = $envContent | Select-String -Pattern "^NEXT_PUBLIC_APP_URL="
    
    if ($appUrl) {
        Write-Host "✅ $appUrl" -ForegroundColor Green
        if ($appUrl -match "localhost") {
            Write-Host "   WARNING: URL points to localhost (OK for dev)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ NEXT_PUBLIC_APP_URL not set" -ForegroundColor Red
    }
} else {
    Write-Host "WARNING: .env.local not found" -ForegroundColor Yellow
}

# Check 7: Metadata implementations
Write-Host "`n7️⃣  Checking page metadata..." -ForegroundColor Yellow
$metadataFiles = Get-ChildItem -Path "app/[locale]" -Recurse -Filter "metadata.ts" -ErrorAction SilentlyContinue

if ($metadataFiles) {
    Write-Host "✅ Found $($metadataFiles.Count) metadata files:" -ForegroundColor Green
    $metadataFiles | ForEach-Object {
        Write-Host "   - $($_.Directory.Name)" -ForegroundColor Green
    }
} else {
    Write-Host "WARNING: No metadata files found (recommended to add)" -ForegroundColor Yellow
}

# Check 8: Structured data in layout
Write-Host "`n8️⃣  Checking layout.tsx for structured data..." -ForegroundColor Yellow
if (Test-Path "app/layout.tsx") {
    $layoutContent = Get-Content "app/layout.tsx" -Raw
    
    if ($layoutContent -match "OrganizationSchema") {
        Write-Host "✅ OrganizationSchema imported" -ForegroundColor Green
    } else {
        Write-Host "❌ OrganizationSchema not imported" -ForegroundColor Red
    }
    
    if ($layoutContent -match "WebsiteSchema") {
        Write-Host "✅ WebsiteSchema imported" -ForegroundColor Green
    } else {
        Write-Host "❌ WebsiteSchema not imported" -ForegroundColor Red
    }
    
    if ($layoutContent -match "SoftwareApplicationSchema") {
        Write-Host "✅ SoftwareApplicationSchema imported" -ForegroundColor Green
    } else {
        Write-Host "❌ SoftwareApplicationSchema not imported" -ForegroundColor Red
    }
} else {
    Write-Host "❌ app/layout.tsx not found" -ForegroundColor Red
}

# Summary
Write-Host "`n" + ("=" * 50)
Write-Host "📊 Summary" -ForegroundColor Cyan
Write-Host ""
Write-Host "To test SEO locally:" -ForegroundColor White
Write-Host "1. npm run build" -ForegroundColor Gray
Write-Host "2. npm run start" -ForegroundColor Gray
Write-Host "3. Visit http://localhost:3000/sitemap.xml" -ForegroundColor Gray
Write-Host "4. Visit http://localhost:3000/robots.txt" -ForegroundColor Gray
Write-Host ""
Write-Host "To validate:" -ForegroundColor White
Write-Host "- Rich Results: https://search.google.com/test/rich-results" -ForegroundColor Gray
Write-Host "- Open Graph: https://www.opengraph.xyz/" -ForegroundColor Gray
Write-Host "- Lighthouse: Run in Chrome DevTools" -ForegroundColor Gray
Write-Host ""
Write-Host "After deploy:" -ForegroundColor White
Write-Host "- Submit sitemap to Google Search Console" -ForegroundColor Gray
Write-Host "- Submit sitemap to Bing Webmaster Tools" -ForegroundColor Gray
Write-Host ""
Write-Host "✨ See SEO_IMPLEMENTATION_GUIDE.md for full details" -ForegroundColor Cyan
