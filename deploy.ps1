#requires -Version 5
$ErrorActionPreference = "Stop"

Write-Host "===== Blog Deployment Tool =====" -ForegroundColor Cyan
Write-Host ""

# Ensure git is available
$env:Path = "D:\111\git\Git\cmd;$env:Path"
$version = git --version 2>&1
Write-Host "[1/4] Git: $version" -ForegroundColor Green
Write-Host ""

# Get GitHub info
$ghUser = Read-Host "[2/4] Your GitHub username"
$repoName = Read-Host "[3/4] Repo name (default: my-blog)"
if (-not $repoName) { $repoName = "my-blog" }
Write-Host "Target: https://github.com/$ghUser/$repoName" -ForegroundColor Gray
Write-Host ""

# Setup repo
Write-Host "[4/4] Initializing repo and pushing..." -ForegroundColor Yellow
Set-Location $PSScriptRoot

# Clean old .git
Remove-Item -Recurse -Force ".git" -ErrorAction SilentlyContinue

# Init repo FIRST
git init

# THEN set git config (inside the repo)
git config user.email "blog@deploy.local"
git config user.name "Blog Admin"

git add .
git commit -m "initial commit"

# Push to GitHub
$remoteUrl = "https://github.com/$ghUser/$repoName.git"
git remote add origin $remoteUrl
git branch -M main

Write-Host ""
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
Write-Host "A browser window may open to log into GitHub." -ForegroundColor Gray
Write-Host "If asked for password, use a Personal Access Token (scope: repo)." -ForegroundColor Gray
Write-Host "Get token: https://github.com/settings/tokens/new" -ForegroundColor Cyan
Write-Host ""

try {
    $output = git push -u origin main 2>&1
    Write-Host $output
    Write-Host ""
    Write-Host "===== SUCCESS =====" -ForegroundColor Green
    Write-Host ""
    Write-Host "Enable GitHub Pages:" -ForegroundColor Cyan
    Write-Host "1. Open: https://github.com/$ghUser/$repoName/settings/pages" -ForegroundColor White
    Write-Host "2. Source: Deploy from a branch" -ForegroundColor White
    Write-Host "3. Branch: main, folder: / (root)" -ForegroundColor White
    Write-Host "4. Click Save" -ForegroundColor White
    Write-Host "5. Visit: https://$ghUser.github.io/$repoName/" -ForegroundColor Yellow
} catch {
    Write-Host ""
    Write-Host "Push failed." -ForegroundColor Red
    Write-Host "Make sure the repo exists: https://github.com/$ghUser/$repoName" -ForegroundColor Yellow
    Write-Host "If not, create it at: https://github.com/new (name: $repoName, public, no README)" -ForegroundColor Cyan
}
Write-Host ""
Read-Host "Press Enter to exit"
