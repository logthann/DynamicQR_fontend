@echo off
REM Remove tracked spec and doc files from Git

setlocal enabledelayedexpansion

cd /d "D:\Documents\Do an tot nghiep\DynamicQR_fontend"

echo.
echo ====================================================
echo  Removing Tracked Spec/Doc Files from Git
echo ====================================================
echo.

echo [1/4] Removing specs/ folder from tracking...
git rm -r --cached specs/ 2>nul

echo [2/4] Removing backend_infomation/ folder from tracking...
git rm -r --cached backend_infomation/ 2>nul

echo [3/4] Removing all .md files from tracking (except phase summaries)...
REM Remove markdown files but keep phase summaries in frontend/
for /f "tokens=*" %%F in ('git ls-files "*.md"') do (
    echo Removing: %%F
    git rm --cached "%%F" 2>nul
)

echo [4/4] Removing openapi.yaml files from tracking...
git rm -r --cached specs/*/contracts/openapi.yaml 2>nul
git rm -r --cached backend_infomation/contracts/openapi.yaml 2>nul

echo.
echo ====================================================
echo  Creating commit for removal
echo ====================================================
echo.

git commit -m "Remove spec/doc files from tracking - exclude from version control

- Removed: specs/ folder (all specification files)
- Removed: backend_infomation/ folder (backend documentation)
- Removed: *.md files (documentation)
- These files are now in .gitignore and won't be tracked

Frontend app code remains tracked in frontend/ folder"

if errorlevel 1 (
    echo No changes to commit (files already untracked)
) else (
    echo Commit created successfully
)

echo.
echo ====================================================
echo  Verification
echo ====================================================
echo.

echo Current git status:
git status

echo.
echo Files still being tracked:
git ls-files | findstr /v "frontend" || echo (All tracked files are in frontend/ folder)

echo.
echo ====================================================
echo  Complete!
echo ====================================================
echo.
echo Spec and doc files removed from Git tracking.
echo They are now in .gitignore and won't appear in future commits.
echo.
pause

