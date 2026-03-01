# Connect this folder to the Replit project's GitHub repo
# Replit project: http://replit.com/@ausdisau1/AccessiBooks
#
# 1. In Replit: Version Control → Connect to GitHub, create/choose repo
# 2. Set the repo URL below (replace with your GitHub username if different)
# 3. Run: .\connect-replit.ps1

$githubRepo = "https://github.com/ausdisau1/AccessiBooks.git"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Git not found. Install from https://git-scm.com/download/win" -ForegroundColor Red
    exit 1
}

Set-Location $PSScriptRoot

if (-not (Test-Path .git)) {
    git init
    git remote add origin $githubRepo
    git branch -M main
    Write-Host "Git initialized. Remote 'origin' set to $githubRepo" -ForegroundColor Green
} else {
    $existing = git remote get-url origin 2>$null
    if ($existing) {
        Write-Host "Remote 'origin' already set: $existing" -ForegroundColor Yellow
    } else {
        git remote add origin $githubRepo
        Write-Host "Remote 'origin' set to $githubRepo" -ForegroundColor Green
    }
}

Write-Host "`nNext: git add . ; git commit -m 'Your message' ; git push -u origin main" -ForegroundColor Cyan
