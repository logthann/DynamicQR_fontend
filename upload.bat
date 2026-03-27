@echo off
REM DynamicQR Frontend - Git Upload Script

setlocal enabledelayedexpansion

echo.
echo ====================================================
echo  DynamicQR Frontend - Git Upload to GitHub
echo ====================================================
echo.

cd /d "D:\Documents\Do an tot nghiep\DynamicQR_fontend"

if errorlevel 1 (
    echo ERROR: Could not change to project directory
    pause
    exit /b 1
)

echo [1/7] Checking Git installation...
git --version
if errorlevel 1 (
    echo ERROR: Git is not installed or not in PATH
    pause
    exit /b 1
)

echo.
echo [2/7] Initializing Git repository...
if not exist .git (
    git init
    echo Git repository initialized
) else (
    echo Git repository already exists
)

echo.
echo [3/7] Configuring user...
git config user.email "dev@dynamicqr.local"
git config user.name "Dynamic QR Dev"
echo User configured: Dynamic QR Dev ^<dev@dynamicqr.local^>

echo.
echo [4/7] Adding application files...
git add frontend/
git add .github/
git add .gitignore
git add .dockerignore
echo Files staged

echo.
echo [5/7] Showing files to be committed...
git diff --cached --name-only
echo.

echo [6/7] Creating commit...
git commit -m "Initial commit: Frontend app (Next.js) with Phase 1-3 implementation"
if errorlevel 1 (
    echo No changes to commit or commit failed
) else (
    echo Commit created successfully
)

echo.
echo [7/7] Configuring GitHub remote and pushing...
set REPO_URL=https://github.com/logthann/DynamicQR_fontend.git

REM Remove existing remote if it exists
git remote remove origin 2>nul

REM Add new remote
git remote add origin %REPO_URL%
echo Remote added: %REPO_URL%

echo.
echo Pushing to GitHub (this may ask for credentials)...
git push -u origin main

if errorlevel 1 (
    echo.
    echo Push may have failed - trying with master branch...
    git push -u origin master
)

echo.
echo ====================================================
echo  Upload Complete!
echo ====================================================
echo.
echo Repository: %REPO_URL%
echo.
echo Verifying remote configuration...
git remote -v

echo.
echo Git log (last 3 commits):
git log --oneline -3

echo.
pause

