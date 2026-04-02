#!/usr/bin/env pwsh

# Git Repository Cleanup Script
# Removes spec/doc files from tracking while keeping frontend app code

$ErrorActionPreference = "Stop"
$repoPath = "D:\Documents\Do an tot nghiep\DynamicQR_fontend"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Git Repository Cleanup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $repoPath

# Check git status
Write-Host "[1] Checking current git status..." -ForegroundColor Green
Write-Host ""

$trackedFiles = @(git ls-files 2>$null)
Write-Host "Currently tracked files: $($trackedFiles.Count)"
Write-Host ""

# Find files to remove
$filesToRemove = @()

# Files/folders that should NOT be tracked
$excludePatterns = @(
    "^specs/",
    "^backend_infomation/",
    "\.md$",
    "^\.specify/",
    "^\.idea/",
    "^\.vscode/",
    "upload\.bat",
    "remove-tracked-specs\.bat",
    "upload\.ps1",
    "push-output\.txt"
)

foreach ($file in $trackedFiles) {
    foreach ($pattern in $excludePatterns) {
        if ($file -match $pattern) {
            $filesToRemove += $file
            break
        }
    }
}

if ($filesToRemove.Count -eq 0) {
    Write-Host "[2] No files to remove - repository is clean!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Current tracked files:" -ForegroundColor Cyan
    $trackedFiles | ForEach-Object { Write-Host "  ✅ $_" }
    Write-Host ""
    Write-Host "Repository status: CLEAN ✅" -ForegroundColor Green
    exit 0
}

# Show files to be removed
Write-Host "[2] Files to be removed from tracking:" -ForegroundColor Yellow
Write-Host ""
$filesToRemove | ForEach-Object { Write-Host "  ❌ $_" }
Write-Host ""

# Ask for confirmation
Write-Host "[3] Confirm removal? (this only removes from git tracking, files stay locally)" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Continue? (yes/no)"

if ($confirm -ne "yes" -and $confirm -ne "y") {
    Write-Host "Cancelled." -ForegroundColor Red
    exit 1
}

# Remove files from git tracking
Write-Host ""
Write-Host "[4] Removing files from git tracking..." -ForegroundColor Green
Write-Host ""

$removed = 0
foreach ($file in $filesToRemove) {
    git rm --cached "$file" 2>$null
    $removed++
    Write-Host "  Removed: $file"
}

Write-Host ""
Write-Host "[5] Creating cleanup commit..." -ForegroundColor Green
Write-Host ""

$commitMsg = @"
Clean up git repository - remove spec/doc files from tracking

- Removed: specs/ folder (specification files)
- Removed: backend_infomation/ folder (backend documentation)
- Removed: *.md documentation files (keep locally for reference)
- Removed: upload scripts and auxiliary files

Repository now tracks only:
- frontend/src/ (application code)
- frontend/tests/ (E2E tests)
- Configuration files (*.json, *.js)
- .github/workflows/ (CI/CD)
- .gitignore, .dockerignore

These files remain locally (not deleted, just untracked):
- specs/ - Specification files for reference
- backend_infomation/ - Backend documentation
- *.md - Documentation
"@

git commit -m $commitMsg

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Cleanup Complete!" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Summary:" -ForegroundColor Green
Write-Host "  Files removed from tracking: $removed" -ForegroundColor Green
Write-Host "  Commit created: ✅" -ForegroundColor Green
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Review: git log --oneline -3" -ForegroundColor White
Write-Host "  2. Push: git push -u origin main (or master)" -ForegroundColor White
Write-Host ""

# Show remaining tracked files
Write-Host "Remaining tracked files:" -ForegroundColor Green
Write-Host ""
$remainingFiles = @(git ls-files 2>$null)
$remainingFiles | ForEach-Object {
    if ($_ -match "^frontend/" -or $_ -match "^\.github/") {
        Write-Host "  ✅ $_"
    } else {
        Write-Host "  ✅ $_"
    }
}

Write-Host ""
Write-Host "Repository is clean and ready to push! 🚀" -ForegroundColor Green

