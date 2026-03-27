$ErrorActionPreference = "Stop"
$repoPath = "D:\Documents\Do an tot nghiep\DynamicQR_fontend"

Write-Host "=== Git Configuration and Upload ===" -ForegroundColor Green
Write-Host "Working directory: $repoPath"

# Change to repo directory
Set-Location $repoPath

# Check git version
Write-Host "`n[1/7] Checking Git installation..."
$gitVersion = & git --version
Write-Host $gitVersion

# Initialize/check git
Write-Host "`n[2/7] Initializing Git repo..."
if (-not (Test-Path ".git")) {
    & git init
    Write-Host "Git repository initialized"
} else {
    Write-Host "Git repository already exists"
}

# Configure user
Write-Host "`n[3/7] Configuring Git user..."
& git config user.email "dev@dynamicqr.local"
& git config user.name "Dynamic QR Dev"
Write-Host "User configured: $(& git config user.name) <$(& git config user.email)>"

# Add remote
Write-Host "`n[4/7] Configuring remote repository..."
$remoteUrl = "https://github.com/logthann/DynamicQR_fontend.git"
$existingRemote = & git remote get-url origin 2>$null
if ($existingRemote -ne $remoteUrl) {
    & git remote remove origin 2>$null
    & git remote add origin $remoteUrl
    Write-Host "Remote added: $remoteUrl"
} else {
    Write-Host "Remote already configured: $remoteUrl"
}

# Add app files (excluding specs and docs)
Write-Host "`n[5/7] Adding application files to staging..."
& git add frontend/ .github/ .dockerignore .gitignore
$stagedCount = (& git diff --cached --name-only | Measure-Object -Line).Lines
Write-Host "Staged $stagedCount files"

# Display what will be committed
Write-Host "`n[5b/7] Preview of staged files:"
& git diff --cached --name-only | Select-Object -First 20
Write-Host "... (showing first 20 files)"

# Create commit
Write-Host "`n[6/7] Creating commit..."
$commitMsg = "Initial commit: Frontend app (Next.js) with Phase 1-3 implementation

- Phase 1: Setup, drift guard, Tailwind CSS Pure Black theme
- Phase 2: Bearer JWT auth, middleware, API client, React Query cache
- Phase 3: Register/Login flows, protected routes, E2E tests

Excluded: Specification files, documentation, backend info"

& git commit -m $commitMsg
Write-Host "Commit created successfully"

# Push to GitHub
Write-Host "`n[7/7] Pushing to GitHub..."
Write-Host "Repository: $remoteUrl"
Write-Host "Branch: main"

& git push -u origin main
Write-Host "`n✅ Upload complete!" -ForegroundColor Green

# Verify
Write-Host "`nVerification:"
& git remote -v
Write-Host "`nCommit log:"
& git log --oneline | Select-Object -First 3

