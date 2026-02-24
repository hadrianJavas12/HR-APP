<# 
.SYNOPSIS
    HR Man-Hour Performance Monitoring System - First-Time Setup Script
    
.DESCRIPTION
    Script otomatis untuk setup environment development dari nol.
    Aman dijalankan berulang kali (idempotent) - hanya install yang belum ada.
    
.USAGE
    Buka PowerShell sebagai Administrator, lalu jalankan:
    
        Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
        .\setup.ps1
    
    Atau langsung:
    
        powershell -ExecutionPolicy Bypass -File .\setup.ps1
    
.NOTES
    Author  : HR App Team
    Date    : 2026-02-24
    Requires: Windows 10/11 64-bit, PowerShell 5.1+
#>

# ============================================================
#  PARAMETERS
# ============================================================
param(
    [switch]$AutoAccept  # Skip all interactive prompts
)

# ============================================================
#  CONFIGURATION
# ============================================================
$ErrorActionPreference = "Stop"
$ProgressPreference    = "SilentlyContinue"   # Speed up Invoke-WebRequest

$PROJECT_DIR      = $PSScriptRoot                          # folder dimana script ini berada
$BACKEND_DIR      = Join-Path $PROJECT_DIR "backend"
$FRONTEND_DIR     = Join-Path $PROJECT_DIR "frontend"
$ENV_FILE         = Join-Path $BACKEND_DIR ".env"
$ENV_EXAMPLE      = Join-Path $BACKEND_DIR ".env.example"
$LOG_FILE         = Join-Path $PROJECT_DIR "setup.log"

# Minimum versions
$MIN_NODE_MAJOR   = 20
$MIN_DOCKER_MAJOR = 24

# Ports used by the system
$REQUIRED_PORTS   = @(3000, 5432, 6379, 8080, 8025, 1025)

# ============================================================
#  HELPER FUNCTIONS
# ============================================================

function Write-Step {
    param([string]$Message)
    $timestamp = Get-Date -Format "HH:mm:ss"
    $line = "[$timestamp] $Message"
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  $Message" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Add-Content -Path $LOG_FILE -Value $line
}

function Write-Status {
    param(
        [string]$Message,
        [ValidateSet("OK","WARN","FAIL","INFO","SKIP")]
        [string]$Status = "INFO"
    )
    $timestamp = Get-Date -Format "HH:mm:ss"
    $colors = @{ OK = "Green"; WARN = "Yellow"; FAIL = "Red"; INFO = "White"; SKIP = "DarkGray" }
    $icons  = @{ OK = "[OK]"; WARN = "[!!]"; FAIL = "[XX]"; INFO = "[--]"; SKIP = "[>>]" }
    
    Write-Host "  $($icons[$Status]) " -ForegroundColor $colors[$Status] -NoNewline
    Write-Host $Message
    Add-Content -Path $LOG_FILE -Value "[$timestamp] $($icons[$Status]) $Message"
}

function Test-CommandExists {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

function Test-PortInUse {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return ($null -ne $connection)
}

function Test-IsAdmin {
    $identity  = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]$identity
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Wait-ForHealthy {
    param(
        [string]$Url,
        [string]$ServiceName,
        [int]$TimeoutSeconds = 120,
        [int]$IntervalSeconds = 5
    )
    $elapsed = 0
    while ($elapsed -lt $TimeoutSeconds) {
        try {
            $response = Invoke-RestMethod -Uri $Url -TimeoutSec 5 -ErrorAction Stop
            if ($response.status -eq "ok" -or $response -ne $null) {
                return $true
            }
        } catch { }
        Start-Sleep -Seconds $IntervalSeconds
        $elapsed += $IntervalSeconds
        Write-Host "    Menunggu $ServiceName... ($elapsed s)" -ForegroundColor DarkGray
    }
    return $false
}

function Get-InstalledNodeVersion {
    try {
        $ver = & node --version 2>$null
        if ($ver -match 'v(\d+)\.(\d+)\.(\d+)') {
            return @{
                Major = [int]$Matches[1]
                Minor = [int]$Matches[2]
                Patch = [int]$Matches[3]
                Full  = $ver
            }
        }
    } catch { }
    return $null
}

function Get-InstalledDockerVersion {
    try {
        $ver = & docker --version 2>$null
        if ($ver -match '(\d+)\.(\d+)\.(\d+)') {
            return @{
                Major = [int]$Matches[1]
                Minor = [int]$Matches[2]
                Patch = [int]$Matches[3]
                Full  = $ver
            }
        }
    } catch { }
    return $null
}

function Test-DockerRunning {
    try {
        $oldEAP = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        $output = & docker info 2>&1
        $exitCode = $LASTEXITCODE
        $ErrorActionPreference = $oldEAP
        return ($exitCode -eq 0)
    } catch {
        return $false
    }
}

function Test-WingetAvailable {
    try {
        $null = & winget --version 2>$null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Install-ViaWinget {
    param(
        [string]$PackageId,
        [string]$FriendlyName
    )
    Write-Status "Menginstall $FriendlyName via winget..." "INFO"
    $result = & winget install --id $PackageId --accept-package-agreements --accept-source-agreements --silent 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Status "$FriendlyName berhasil diinstall" "OK"
        return $true
    } else {
        # winget returns non-zero when already installed too
        if ($result -match "already installed") {
            Write-Status "$FriendlyName sudah terinstall (via winget)" "SKIP"
            return $true
        }
        Write-Status "Gagal install $FriendlyName via winget. Output: $result" "FAIL"
        return $false
    }
}

# ============================================================
#  BANNER
# ============================================================

Clear-Host
Write-Host ""
Write-Host "  ╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "  ║                                                           ║" -ForegroundColor Blue
Write-Host "  ║   HR Man-Hour Performance Monitoring System               ║" -ForegroundColor Blue
Write-Host "  ║   First-Time Setup Script v1.0                            ║" -ForegroundColor Blue
Write-Host "  ║                                                           ║" -ForegroundColor Blue
Write-Host "  ║   Script ini akan:                                        ║" -ForegroundColor Blue
Write-Host "  ║   1. Cek dan install Node.js, Git, Docker                   ║" -ForegroundColor Blue
Write-Host "  ║   2. Install npm dependencies                             ║" -ForegroundColor Blue
Write-Host "  ║   3. Setup environment file                               ║" -ForegroundColor Blue
Write-Host "  ║   4. Build dan start Docker containers                      ║" -ForegroundColor Blue
Write-Host "  ║   5. Inisialisasi database (migrasi + seed)               ║" -ForegroundColor Blue
Write-Host "  ║   6. Verifikasi semua service berjalan                    ║" -ForegroundColor Blue
Write-Host "  ║                                                           ║" -ForegroundColor Blue
Write-Host "  ╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""

# Start log
"" | Set-Content $LOG_FILE
Add-Content -Path $LOG_FILE -Value "=== HR App Setup Log - $(Get-Date) ==="
Add-Content -Path $LOG_FILE -Value "=== OS: $([System.Environment]::OSVersion.VersionString) ==="
Add-Content -Path $LOG_FILE -Value "=== PowerShell: $($PSVersionTable.PSVersion) ==="
Add-Content -Path $LOG_FILE -Value ""

# ============================================================
#  STEP 0: Preflight Checks
# ============================================================

Write-Step "STEP 0/7 - Preflight Checks"

# Check admin rights
if (Test-IsAdmin) {
    Write-Status "Running as Administrator" "OK"
} else {
    Write-Status "TIDAK running sebagai Administrator" "WARN"
    Write-Status "Beberapa instalasi mungkin memerlukan Administrator." "WARN"
    Write-Status "Jika gagal install, jalankan ulang PowerShell sebagai Admin." "WARN"
    if (-not $AutoAccept) {
        Write-Host ""
        $proceed = Read-Host "  Lanjutkan tanpa Admin? (y/N)"
        if ($proceed -ne 'y' -and $proceed -ne 'Y') {
            Write-Host "  Setup dibatalkan. Jalankan ulang sebagai Administrator." -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Status "AutoAccept aktif - melanjutkan tanpa Admin" "INFO"
    }
}

# Check project structure
if (-not (Test-Path (Join-Path $BACKEND_DIR "package.json"))) {
    Write-Status "Folder backend/package.json tidak ditemukan!" "FAIL"
    Write-Status "Pastikan script ini berada di root folder project (HR APP)" "FAIL"
    exit 1
}
if (-not (Test-Path (Join-Path $FRONTEND_DIR "package.json"))) {
    Write-Status "Folder frontend/package.json tidak ditemukan!" "FAIL"
    exit 1
}
Write-Status "Struktur project terdeteksi dengan benar" "OK"

# Check winget availability
$hasWinget = Test-WingetAvailable
if ($hasWinget) {
    Write-Status "winget package manager tersedia" "OK"
} else {
    Write-Status "winget tidak tersedia - akan menggunakan installer manual" "WARN"
}

# Check port conflicts
$portConflicts = @()
foreach ($port in $REQUIRED_PORTS) {
    if (Test-PortInUse $port) {
        $portConflicts += $port
    }
}
if ($portConflicts.Count -gt 0) {
    Write-Status "Port sedang dipakai: $($portConflicts -join ', ')" "WARN"
    Write-Status "Ini mungkin karena container HR App sudah running, atau service lain." "WARN"
    Write-Status "Jika setup gagal karena port, stop service yang memakai port tersebut." "WARN"
} else {
    Write-Status "Semua port yang dibutuhkan tersedia ($($REQUIRED_PORTS -join ', '))" "OK"
}

# ============================================================
#  STEP 1: Git
# ============================================================

Write-Step "STEP 1/7 - Git"

if (Test-CommandExists "git") {
    $gitVer = & git --version 2>$null
    Write-Status "Git sudah terinstall: $gitVer" "SKIP"
} else {
    Write-Status "Git belum terinstall" "INFO"
    
    if ($hasWinget) {
        Install-ViaWinget "Git.Git" "Git"
    } else {
        Write-Status "Downloading Git installer..." "INFO"
        $gitInstaller = Join-Path $env:TEMP "git-installer.exe"
        try {
            Invoke-WebRequest -Uri "https://github.com/git-for-windows/git/releases/download/v2.44.0.windows.1/Git-2.44.0-64-bit.exe" -OutFile $gitInstaller
            Write-Status "Menjalankan Git installer (silent)..." "INFO"
            Start-Process -FilePath $gitInstaller -ArgumentList "/VERYSILENT /NORESTART /NOCANCEL /SP-" -Wait
            Remove-Item $gitInstaller -ErrorAction SilentlyContinue
            Write-Status "Git berhasil diinstall" "OK"
        } catch {
            Write-Status "Gagal download/install Git: $_" "FAIL"
            Write-Status "Install manual dari https://git-scm.com/downloads/win" "INFO"
        }
    }
    
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
}

# ============================================================
#  STEP 2: Node.js
# ============================================================

Write-Step "STEP 2/7 - Node.js"

$nodeInfo = Get-InstalledNodeVersion

if ($null -ne $nodeInfo) {
    if ($nodeInfo.Major -ge $MIN_NODE_MAJOR) {
        Write-Status "Node.js sudah terinstall: $($nodeInfo.Full) (>= v$MIN_NODE_MAJOR requirement)" "SKIP"
    } else {
        Write-Status "Node.js terinstall tapi versi terlalu lama: $($nodeInfo.Full)" "WARN"
        Write-Status "Dibutuhkan Node.js >= v$MIN_NODE_MAJOR. Akan mengupgrade..." "INFO"
        $needNodeInstall = $true
    }
} else {
    Write-Status "Node.js belum terinstall" "INFO"
    $needNodeInstall = $true
}

if ($needNodeInstall) {
    if ($hasWinget) {
        Install-ViaWinget "OpenJS.NodeJS.LTS" "Node.js 20 LTS"
    } else {
        Write-Status "Downloading Node.js 20 LTS installer..." "INFO"
        $nodeInstaller = Join-Path $env:TEMP "node-v20-installer.msi"
        try {
            Invoke-WebRequest -Uri "https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi" -OutFile $nodeInstaller
            Write-Status "Menjalankan Node.js installer (silent)..." "INFO"
            Start-Process -FilePath msiexec.exe -ArgumentList "/i `"$nodeInstaller`" /qn /norestart" -Wait
            Remove-Item $nodeInstaller -ErrorAction SilentlyContinue
            Write-Status "Node.js berhasil diinstall" "OK"
        } catch {
            Write-Status "Gagal download/install Node.js: $_" "FAIL"
            Write-Status "Install manual dari https://nodejs.org/" "INFO"
            exit 1
        }
    }
    
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    
    # Verify
    $nodeInfo = Get-InstalledNodeVersion
    if ($null -ne $nodeInfo) {
        Write-Status "Node.js terverifikasi: $($nodeInfo.Full)" "OK"
    } else {
        Write-Status "Node.js tidak terdeteksi setelah instalasi!" "FAIL"
        Write-Status "Tutup PowerShell ini, buka PowerShell BARU, lalu jalankan setup.ps1 lagi." "INFO"
        Write-Status "(PATH baru kadang butuh restart terminal)" "INFO"
        exit 1
    }
}

# Verify npm
try {
    $npmVer = & npm --version 2>$null
    Write-Status "npm terdeteksi: v$npmVer" "OK"
} catch {
    Write-Status "npm tidak terdeteksi. Pastikan Node.js terinstall dengan benar." "FAIL"
    exit 1
}

# ============================================================
#  STEP 3: Docker
# ============================================================

Write-Step "STEP 3/7 - Docker Desktop"

$dockerInfo = Get-InstalledDockerVersion
$dockerNeedInstall = $false
$dockerNeedStart   = $false

if ($null -ne $dockerInfo) {
    Write-Status "Docker terdeteksi: $($dockerInfo.Full)" "SKIP"
    
    if (-not (Test-DockerRunning)) {
        Write-Status "Docker Desktop TIDAK sedang berjalan" "WARN"
        $dockerNeedStart = $true
    } else {
        Write-Status "Docker Desktop sedang berjalan" "OK"
    }
} else {
    Write-Status "Docker belum terinstall" "INFO"
    $dockerNeedInstall = $true
}

if ($dockerNeedInstall) {
    if ($hasWinget) {
        Install-ViaWinget "Docker.DockerDesktop" "Docker Desktop"
    } else {
        Write-Status "Downloading Docker Desktop installer..." "INFO"
        $dockerInstaller = Join-Path $env:TEMP "docker-desktop-installer.exe"
        try {
            Invoke-WebRequest -Uri "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe" -OutFile $dockerInstaller
            Write-Status "Menjalankan Docker Desktop installer..." "INFO"
            Write-Status "Installer akan muncul - ikuti instruksinya." "INFO"
            Start-Process -FilePath $dockerInstaller -ArgumentList "install --accept-license --quiet" -Wait
            Remove-Item $dockerInstaller -ErrorAction SilentlyContinue
            Write-Status "Docker Desktop berhasil diinstall" "OK"
        } catch {
            Write-Status "Gagal download/install Docker: $_" "FAIL"
            Write-Status "Install manual dari https://www.docker.com/products/docker-desktop/" "INFO"
            exit 1
        }
    }
    
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    $dockerNeedStart = $true
}

if ($dockerNeedStart) {
    Write-Status "Memulai Docker Desktop..." "INFO"
    
    # Try to start Docker Desktop
    $dockerExePath = ""
    $possiblePaths = @(
        "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
        "$env:LOCALAPPDATA\Docker\Docker Desktop.exe",
        "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe"
    )
    
    foreach ($p in $possiblePaths) {
        if (Test-Path $p) {
            $dockerExePath = $p
            break
        }
    }
    
    if ($dockerExePath) {
        Start-Process $dockerExePath
        Write-Status "Docker Desktop sedang starting... (mungkin perlu 30-90 detik)" "INFO"
        
        $dockerReady = $false
        $waited = 0
        $maxWait = 180  # 3 minutes
        
        while (-not $dockerReady -and $waited -lt $maxWait) {
            Start-Sleep -Seconds 5
            $waited += 5
            
            if (Test-DockerRunning) {
                $dockerReady = $true
            } else {
                if ($waited % 15 -eq 0) {
                    Write-Host "    Menunggu Docker ready... ($waited s)" -ForegroundColor DarkGray
                }
            }
        }
        
        if ($dockerReady) {
            Write-Status "Docker Desktop sudah berjalan!" "OK"
        } else {
            Write-Status "Docker Desktop tidak kunjung ready setelah ${maxWait}s" "FAIL"
            Write-Status "Kemungkinan:" "INFO"
            Write-Status "  - Perlu restart komputer setelah install pertama kali" "INFO"
            Write-Status "  - WSL 2 perlu diaktifkan (Docker Desktop biasanya auto-prompt)" "INFO"
            Write-Status "  - Buka Docker Desktop manual, tunggu sampai 'running', lalu jalankan setup.ps1 lagi" "INFO"
            exit 1
        }
    } else {
        Write-Status "Docker Desktop executable tidak ditemukan" "FAIL"
        Write-Status "Buka Docker Desktop manual, tunggu sampai running, lalu jalankan setup.ps1 lagi" "INFO"
        exit 1
    }
}

# Verify docker compose
try {
    $composeVer = & docker compose version 2>$null
    Write-Status "Docker Compose: $composeVer" "OK"
} catch {
    Write-Status "docker compose tidak tersedia." "FAIL"
    Write-Status "Pastikan Docker Desktop versi terbaru (Compose V2 sudah built-in)." "INFO"
    exit 1
}

# ============================================================
#  STEP 4: NPM Dependencies
# ============================================================

Write-Step "STEP 4/7 - Install NPM Dependencies"

Push-Location $PROJECT_DIR

# Check if node_modules exist and are up to date
$backendModules  = Join-Path $BACKEND_DIR  "node_modules"
$frontendModules = Join-Path $FRONTEND_DIR "node_modules"

if ((Test-Path $backendModules) -and (Test-Path $frontendModules)) {
    Write-Status "node_modules sudah ada di backend dan frontend" "INFO"
    Write-Status "Menjalankan npm install untuk memastikan up-to-date..." "INFO"
}

try {
    Write-Status "npm install (root + workspaces)..." "INFO"
    $oldEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $npmOutput = & npm install 2>&1
    $npmExitCode = $LASTEXITCODE
    $ErrorActionPreference = $oldEAP
    if ($npmExitCode -ne 0) {
        # Sometimes npm returns non-zero but still works - check if modules exist
        if ((Test-Path $backendModules) -and (Test-Path $frontendModules)) {
            Write-Status "npm install selesai (dengan warnings)" "WARN"
        } else {
            throw "npm install gagal (exit code: $npmExitCode)"
        }
    } else {
        Write-Status "npm install selesai - semua dependencies terinstall" "OK"
    }
} catch {
    Write-Status "npm install gagal: $_" "FAIL"
    Write-Status "Coba jalankan manual: cd '$PROJECT_DIR' lalu 'npm install'" "INFO"
    
    # Fallback: install per-workspace
    Write-Status "Mencoba install per-folder..." "INFO"
    
    try {
        $ErrorActionPreference = "Continue"
        Push-Location $BACKEND_DIR
        & npm install 2>&1 | Out-Null
        Pop-Location
        
        Push-Location $FRONTEND_DIR
        & npm install 2>&1 | Out-Null
        Pop-Location
        $ErrorActionPreference = "Stop"
        
        if ((Test-Path $backendModules) -and (Test-Path $frontendModules)) {
            Write-Status "Install per-folder berhasil" "OK"
        } else {
            throw "node_modules tidak ditemukan setelah install"
        }
    } catch {
        $ErrorActionPreference = "Stop"
        Write-Status "Install per-folder juga gagal: $_" "FAIL"
        Pop-Location -ErrorAction SilentlyContinue
        exit 1
    }
}

Pop-Location

# ============================================================
#  STEP 5: Environment File
# ============================================================

Write-Step "STEP 5/7 - Environment Configuration"

if (Test-Path $ENV_FILE) {
    Write-Status "File backend/.env sudah ada - tidak akan di-overwrite" "SKIP"
    Write-Status "Jika ingin reset: hapus backend/.env lalu jalankan setup.ps1 lagi" "INFO"
} else {
    if (Test-Path $ENV_EXAMPLE) {
        Copy-Item $ENV_EXAMPLE $ENV_FILE
        Write-Status "backend/.env dibuat dari .env.example" "OK"
        
        # Generate random JWT secrets for better security even in dev
        try {
            $jwtSecret        = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
            $jwtRefreshSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
            
            $envContent = Get-Content $ENV_FILE -Raw
            $envContent = $envContent -replace 'JWT_SECRET=change-me-to-a-random-64-char-string-in-production',       "JWT_SECRET=$jwtSecret"
            $envContent = $envContent -replace 'JWT_REFRESH_SECRET=change-me-to-another-random-64-char-string',       "JWT_REFRESH_SECRET=$jwtRefreshSecret"
            $envContent | Set-Content $ENV_FILE -NoNewline
            
            Write-Status "JWT secrets di-generate secara random" "OK"
        } catch {
            Write-Status "Gagal generate JWT secrets, pakai default (.env.example)" "WARN"
        }
    } else {
        Write-Status ".env.example tidak ditemukan! Membuat .env minimal..." "WARN"
        @"
NODE_ENV=development
PORT=3000
DB_HOST=postgres
DB_PORT=5432
DB_NAME=hr_manhour
DB_USER=hr_admin
DB_PASSWORD=hr_secure_password_2026
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=$(([guid]::NewGuid().ToString() + [guid]::NewGuid().ToString()) -replace '-','')
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=$(([guid]::NewGuid().ToString() + [guid]::NewGuid().ToString()) -replace '-','')
JWT_REFRESH_EXPIRES_IN=7d
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_FROM=noreply@hr-manhour.local
DEFAULT_DAILY_HOURS=8
DEFAULT_WEEKLY_CAPACITY=40
OVERLOAD_THRESHOLD=110
UNDERUTIL_THRESHOLD=60
"@ | Set-Content $ENV_FILE
        Write-Status ".env minimal berhasil dibuat" "OK"
    }
}

# ============================================================
#  STEP 6: Docker Build dan Start
# ============================================================

Write-Step "STEP 6/7 - Docker Build dan Start Containers"

Push-Location $PROJECT_DIR

# Temporarily set error preference to Continue for docker commands
$oldEAP = $ErrorActionPreference
$ErrorActionPreference = "Continue"

# Stop existing containers (if any) - don't fail if none exist
Write-Status "Stopping existing containers (jika ada)..." "INFO"
& docker compose down 2>$null

# Build images
Write-Status "Building Docker images... (pertama kali bisa 5-15 menit)" "INFO"
& docker compose build 2>&1 | ForEach-Object {
    if ($_ -match "error|ERROR|failed|FAILED") {
        Write-Host "    $_" -ForegroundColor Red
    } elseif ($_ -match "Step|STEP|Building|FROM|RUN|COPY|Successfully") {
        Write-Host "    $_" -ForegroundColor DarkGray
    }
}

if ($LASTEXITCODE -ne 0) {
    Write-Status "Docker build gagal!" "FAIL"
    Write-Status "Jalankan 'docker compose build --no-cache' untuk melihat detail error" "INFO"
    Pop-Location
    exit 1
}
Write-Status "Docker images berhasil di-build" "OK"

# Start all services
Write-Status "Starting all containers..." "INFO"
& docker compose up -d 2>&1 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }

if ($LASTEXITCODE -ne 0) {
    Write-Status "docker compose up gagal!" "FAIL"
    & docker compose logs --tail=30 2>&1
    Pop-Location
    exit 1
}

# Wait for services to be healthy
Write-Status "Menunggu PostgreSQL healthy..." "INFO"
$pgReady = $false
$pgWait  = 0
while (-not $pgReady -and $pgWait -lt 60) {
    $pgStatus = & docker compose ps postgres --format "{{.Status}}" 2>$null
    if ($pgStatus -match "healthy") {
        $pgReady = $true
    } else {
        Start-Sleep -Seconds 3
        $pgWait += 3
    }
}
if ($pgReady) {
    Write-Status "PostgreSQL healthy!" "OK"
} else {
    Write-Status "PostgreSQL tidak kunjung healthy (waited ${pgWait}s)" "WARN"
    Write-Status "Mencoba lanjut..." "INFO"
}

Write-Status "Menunggu Redis healthy..." "INFO"
$redisReady = $false
$redisWait  = 0
while (-not $redisReady -and $redisWait -lt 30) {
    $redisStatus = & docker compose ps redis --format "{{.Status}}" 2>$null
    if ($redisStatus -match "healthy") {
        $redisReady = $true
    } else {
        Start-Sleep -Seconds 2
        $redisWait += 2
    }
}
if ($redisReady) {
    Write-Status "Redis healthy!" "OK"
} else {
    Write-Status "Redis belum ready, mencoba lanjut..." "WARN"
}

# Wait a bit more for backend to fully start
Write-Status "Menunggu Backend start (10 detik)..." "INFO"
Start-Sleep -Seconds 10

$ErrorActionPreference = $oldEAP

Pop-Location

# ============================================================
#  STEP 7: Database Init
# ============================================================

Write-Step "STEP 7/7 - Database Migration dan Seed"

Push-Location $PROJECT_DIR

# Temporarily set error preference to Continue for docker exec commands
$oldEAP = $ErrorActionPreference
$ErrorActionPreference = "Continue"

# Check if migrations already ran
Write-Status "Menjalankan database migration..." "INFO"
$migrateOutput = & docker compose exec -T backend node node_modules/.bin/knex migrate:latest --knexfile src/config/knexfile.js 2>&1
$migrateExitCode = $LASTEXITCODE

if ($migrateExitCode -eq 0) {
    if ($migrateOutput -match "Already up to date") {
        Write-Status "Database sudah up-to-date (migrasi sebelumnya sudah jalan)" "SKIP"
    } else {
        Write-Status "Database migration berhasil!" "OK"
        $migrateOutput | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    }
} else {
    Write-Status "Migration gagal! Output:" "FAIL"
    $migrateOutput | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
    Write-Status "Kemungkinan database belum ready. Coba tunggu 15 detik lalu jalankan:" "INFO"
    Write-Status "  docker compose exec backend npx knex migrate:latest --knexfile src/config/knexfile.js" "INFO"
    # Don't exit - let user see the results summary
}

# Seed data
Write-Status "Menjalankan database seed (data demo)..." "INFO"
$seedOutput = & docker compose exec -T backend node node_modules/.bin/knex seed:run --knexfile src/config/knexfile.js 2>&1
$seedExitCode = $LASTEXITCODE

if ($seedExitCode -eq 0) {
    Write-Status "Seed data berhasil dimasukkan!" "OK"
    $seedOutput | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
} else {
    # Seed might fail if data already exists (duplicate keys) - that's OK
    if ($seedOutput -match "duplicate|already exists|unique") {
        Write-Status "Seed data sudah ada (dari setup sebelumnya) - dilewati" "SKIP"
    } else {
        Write-Status "Seed gagal - data demo mungkin perlu dimasukkan manual" "WARN"
        $seedOutput | ForEach-Object { Write-Host "    $_" -ForegroundColor Yellow }
    }
}

$ErrorActionPreference = $oldEAP

Pop-Location

# ============================================================
#  SUMMARY & VERIFICATION
# ============================================================

Write-Step "SETUP SELESAI - Verifikasi"

# Check all containers
Write-Host ""
Write-Status "Status containers:" "INFO"
Push-Location $PROJECT_DIR
$oldEAP = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$containerStatus = & docker compose ps 2>&1
$ErrorActionPreference = $oldEAP
$containerStatus | ForEach-Object { Write-Host "    $_" -ForegroundColor White }
Pop-Location
Write-Host ""

# Test API health
Write-Status "Testing API health endpoint..." "INFO"
$apiHealthy = $false
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -TimeoutSec 10 -ErrorAction Stop
    if ($healthResponse.status -eq "ok") {
        Write-Status "Backend API: HEALTHY" "OK"
        $apiHealthy = $true
    }
} catch {
    Write-Status "Backend API belum merespons - mungkin masih starting" "WARN"
    Write-Status "Coba akses http://localhost:3000/api/health di browser dalam 30 detik" "INFO"
}

# Test frontend
Write-Status "Testing Frontend..." "INFO"
$frontendHealthy = $false
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Status "Frontend: OK (HTTP 200)" "OK"
        $frontendHealthy = $true
    }
} catch {
    Write-Status "Frontend belum merespons di port 8080" "WARN"
}

# Final summary
Write-Host ""
Write-Host "  ╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║                                                           ║" -ForegroundColor Green
Write-Host "  ║               SETUP BERHASIL!                             ║" -ForegroundColor Green
Write-Host "  ║                                                           ║" -ForegroundColor Green
Write-Host "  ╠═══════════════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "  ║                                                           ║" -ForegroundColor Green
Write-Host "  ║  Akses aplikasi:                                          ║" -ForegroundColor Green
Write-Host "  ║                                                           ║" -ForegroundColor Green
Write-Host "  ║    Frontend  : " -ForegroundColor Green -NoNewline
Write-Host "http://localhost:8080              " -ForegroundColor Yellow -NoNewline
Write-Host "    ║" -ForegroundColor Green
Write-Host "  ║    Backend   : " -ForegroundColor Green -NoNewline
Write-Host "http://localhost:3000/api/health   " -ForegroundColor Yellow -NoNewline
Write-Host "    ║" -ForegroundColor Green
Write-Host "  ║    MailHog   : " -ForegroundColor Green -NoNewline
Write-Host "http://localhost:8025              " -ForegroundColor Yellow -NoNewline
Write-Host "    ║" -ForegroundColor Green
Write-Host "  ║                                                           ║" -ForegroundColor Green
Write-Host "  ║  Login demo:                                              ║" -ForegroundColor Green
Write-Host "  ║    Username  : " -ForegroundColor Green -NoNewline
Write-Host "admin                              " -ForegroundColor White -NoNewline
Write-Host "    ║" -ForegroundColor Green
Write-Host "  ║    Password  : " -ForegroundColor Green -NoNewline
Write-Host "password123                        " -ForegroundColor White -NoNewline
Write-Host "    ║" -ForegroundColor Green
Write-Host "  ║                                                           ║" -ForegroundColor Green
Write-Host "  ║  Commands:                                                ║" -ForegroundColor Green
Write-Host "  ║    Stop      : " -ForegroundColor Green -NoNewline
Write-Host "docker compose down                " -ForegroundColor Cyan -NoNewline
Write-Host "    ║" -ForegroundColor Green
Write-Host "  ║    Start     : " -ForegroundColor Green -NoNewline
Write-Host "docker compose up -d               " -ForegroundColor Cyan -NoNewline
Write-Host "    ║" -ForegroundColor Green
Write-Host "  ║    Logs      : " -ForegroundColor Green -NoNewline
Write-Host "docker compose logs -f             " -ForegroundColor Cyan -NoNewline
Write-Host "    ║" -ForegroundColor Green
Write-Host "  ║    Reset DB  : " -ForegroundColor Green -NoNewline
Write-Host "docker compose down -v             " -ForegroundColor Cyan -NoNewline
Write-Host "    ║" -ForegroundColor Green
Write-Host "  ║                                                           ║" -ForegroundColor Green
Write-Host "  ║  Log file    : " -ForegroundColor Green -NoNewline
Write-Host "setup.log                          " -ForegroundColor DarkGray -NoNewline
Write-Host "    ║" -ForegroundColor Green
Write-Host "  ║                                                           ║" -ForegroundColor Green
Write-Host "  ╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

if (-not $apiHealthy -or -not $frontendHealthy) {
    Write-Host "  [!] Beberapa service mungkin masih starting." -ForegroundColor Yellow
    Write-Host "      Tunggu 30 detik lalu buka http://localhost:8080" -ForegroundColor Yellow
    Write-Host "      Cek log: docker compose logs -f" -ForegroundColor Yellow
    Write-Host ""
}

# Open browser automatically
if ($AutoAccept) {
    Start-Process "http://localhost:8080"
} else {
    $openBrowser = Read-Host "  Buka aplikasi di browser sekarang? (Y/n)"
    if ($openBrowser -ne 'n' -and $openBrowser -ne 'N') {
        Start-Process "http://localhost:8080"
    }
}

Write-Host ""
Write-Host "  Selesai! Setup log tersimpan di: $LOG_FILE" -ForegroundColor DarkGray
Write-Host ""
