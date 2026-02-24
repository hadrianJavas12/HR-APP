# HR Man-Hour Performance Monitoring System
# Panduan Lengkap: Testing, Build & Deploy

> Dokumen ini berisi panduan **step-by-step** dari nol (belum install apa-apa) sampai
> aplikasi running di server TrueNAS Anda.

---

## Daftar Isi

1. [Prasyarat & Instalasi Tools](#1-prasyarat--instalasi-tools)
2. [Clone / Copy Source Code](#2-clone--copy-source-code)
3. [Konfigurasi Environment](#3-konfigurasi-environment)
4. [Development Lokal (Opsional)](#4-development-lokal-opsional)
5. [Menjalankan Test](#5-menjalankan-test)
6. [Build & Deploy di TrueNAS](#6-build--deploy-di-truenas)
7. [Inisialisasi Database](#7-inisialisasi-database)
8. [Verifikasi Deployment](#8-verifikasi-deployment)
9. [Operasional & Maintenance](#9-operasional--maintenance)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prasyarat & Instalasi Tools

### 1.1 Di Komputer Development (Windows)

#### a) Install Node.js 20 LTS

1. Buka https://nodejs.org/
2. Download **Node.js 20 LTS** (versi `20.x.x`)
3. Jalankan installer, klik **Next** terus sampai selesai
4. Verifikasi:

```powershell
node --version
# Output: v20.x.x

npm --version
# Output: 10.x.x
```

#### b) Install Git

1. Buka https://git-scm.com/downloads/win
2. Download & install, gunakan setting default
3. Verifikasi:

```powershell
git --version
# Output: git version 2.x.x
```

#### c) Install Docker Desktop (untuk testing lokal)

> Jika Anda hanya ingin deploy langsung ke TrueNAS tanpa test lokal, bagian ini opsional.

1. Buka https://www.docker.com/products/docker-desktop/
2. Download **Docker Desktop for Windows**
3. Jalankan installer
4. Restart komputer jika diminta
5. Buka Docker Desktop, tunggu sampai statusnya **"Running"** (ikon di system tray berwarna hijau)
6. Verifikasi:

```powershell
docker --version
# Output: Docker version 27.x.x

docker compose version
# Output: Docker Compose version v2.x.x
```

> **Catatan Windows**: Docker Desktop butuh WSL 2 atau Hyper-V.
> Jika diminta enable WSL 2, ikuti instruksi di layar lalu restart.

---

### 1.2 Di Server TrueNAS

#### Opsi A: TrueNAS SCALE (Recommended)

TrueNAS SCALE sudah berbasis Linux (Debian), jadi Docker bisa diinstall langsung.

1. **SSH ke TrueNAS** (enable SSH dari UI TrueNAS terlebih dahulu):

```bash
ssh root@IP_TRUENAS_ANDA
# Contoh: ssh root@192.168.1.100
```

2. **Install Docker & Docker Compose** (jika belum ada):

```bash
# Cek apakah Docker sudah ada
docker --version

# Jika belum, install Docker
curl -fsSL https://get.docker.com | bash

# Install Docker Compose plugin
apt-get update
apt-get install -y docker-compose-plugin

# Verifikasi
docker --version
docker compose version
```

3. **Buat direktori untuk app**:

```bash
# Buat folder di pool TrueNAS
mkdir -p /mnt/pool/apps/hr-app
cd /mnt/pool/apps/hr-app
```

> Ganti `/mnt/pool` dengan path pool dataset Anda.
> Cek pool dengan: `zpool list` atau lihat di TrueNAS UI → Storage.

#### Opsi B: TrueNAS CORE (FreeBSD)

TrueNAS CORE berbasis FreeBSD dan **tidak mendukung Docker secara native**.
Solusi:

1. Buat **VM (Virtual Machine)** di TrueNAS CORE dengan Ubuntu Server 22.04
2. Alokasikan min 2 CPU, 4GB RAM, 40GB disk
3. Install Docker di dalam VM tersebut (ikuti langkah Opsi A di dalam VM)

---

## 2. Clone / Copy Source Code

### Opsi A: Menggunakan Git (Recommended)

Di komputer development:

```powershell
# Inisialisasi Git repository
cd "D:\HR APP"
git init
git add .
git commit -m "Initial commit: HR Man-Hour Monitoring System"

# Push ke repository (GitHub/GitLab)
# Buat repository baru di GitHub, lalu:
git remote add origin https://github.com/USERNAME/hr-app.git
git branch -M main
git push -u origin main
```

Di server TrueNAS:

```bash
cd /mnt/pool/apps
git clone https://github.com/USERNAME/hr-app.git hr-app
cd hr-app
```

### Opsi B: Copy Manual (SCP/SFTP)

Di komputer development (PowerShell):

```powershell
# Compress folder project
Compress-Archive -Path "D:\HR APP\*" -DestinationPath "D:\hr-app.zip"

# Upload via SCP
scp "D:\hr-app.zip" root@IP_TRUENAS:/mnt/pool/apps/
```

Di server TrueNAS:

```bash
cd /mnt/pool/apps
unzip hr-app.zip -d hr-app
cd hr-app
```

### Opsi C: Copy Manual via SMB (Windows Share)

1. Di TrueNAS UI → Shares → SMB, buat share ke pool dataset Anda
2. Di Windows Explorer, buka `\\IP_TRUENAS\share_name`
3. Copy folder `HR APP` ke share tersebut
4. SSH ke TrueNAS, navigate ke folder yang sudah di-copy

---

## 3. Konfigurasi Environment

### 3.1 Backend Environment Variables

```bash
cd /mnt/pool/apps/hr-app

# Copy template environment
cp backend/.env.example backend/.env

# Edit file environment
nano backend/.env
```

> Jika `nano` tidak ada: `apt-get install -y nano` atau gunakan `vi`.

**Yang WAJIB diubah untuk production:**

```env
# ── Application ──
NODE_ENV=production
APP_URL=http://IP_TRUENAS:8080
FRONTEND_URL=http://IP_TRUENAS:8080

# ── Database ──
# Samakan dengan docker-compose.yml
DB_HOST=postgres
DB_PORT=5432
DB_NAME=hr_manhour
DB_USER=hr_admin
DB_PASSWORD=GANTI_PASSWORD_YANG_KUAT

# ── JWT (WAJIB GANTI!) ──
JWT_SECRET=buat-string-random-64-karakter-disini-jangan-pakai-default
JWT_REFRESH_SECRET=buat-string-random-64-karakter-berbeda-disini

# ── Redis ──
REDIS_HOST=redis
REDIS_PORT=6379
```

**Generate random string untuk JWT:**

```bash
# Di Linux/TrueNAS:
openssl rand -hex 32
# Output contoh: a3f1b2c4d5e6f7890123456789abcdef0123456789abcdef0123456789abcdef

# Jalankan 2x, satu untuk JWT_SECRET, satu untuk JWT_REFRESH_SECRET
```

### 3.2 Update docker-compose.yml (Production Password)

```bash
nano docker-compose.yml
```

Ubah password PostgreSQL agar sama dengan `.env`:

```yaml
services:
  postgres:
    environment:
      POSTGRES_PASSWORD: GANTI_PASSWORD_YANG_KUAT   # ← samakan dengan DB_PASSWORD di .env

  backend:
    build:
      target: production    # ← ganti dari "development" ke "production"
    environment:
      DB_PASSWORD: GANTI_PASSWORD_YANG_KUAT          # ← samakan
      JWT_SECRET: string-random-jwt-anda              # ← samakan dengan .env
      JWT_REFRESH_SECRET: string-random-refresh-anda  # ← samakan dengan .env
      FRONTEND_URL: http://IP_TRUENAS:8080
```

---

## 4. Development Lokal (Opsional)

> Bagian ini untuk development & testing di komputer Windows Anda.
> Jika ingin langsung deploy ke TrueNAS, lanjut ke [bagian 5](#5-menjalankan-test).

### 4.1 Install Dependencies

Buka PowerShell di folder project:

```powershell
cd "D:\HR APP"

# Install semua dependencies (root + backend + frontend)
npm install
```

Ini akan menginstall dependencies untuk:
- Root workspace
- `backend/node_modules/` (Express, Knex, Objection, dll)
- `frontend/node_modules/` (Vue, Pinia, Tailwind, dll)

### 4.2 Jalankan dengan Docker Desktop

```powershell
cd "D:\HR APP"

# Build & start semua service
docker compose up --build

# Atau jalankan di background
docker compose up -d --build

# Lihat log
docker compose logs -f
```

Tunggu sampai semua container berjalan:

```
hr-postgres  | ... database system is ready to accept connections
hr-redis     | ... Ready to accept connections
hr-backend   | ... Server running on port 3000
hr-frontend  | ... nginx ready
```

### 4.3 Inisialisasi Database (Pertama Kali)

```powershell
# Jalankan migrasi database
docker compose exec backend npx knex migrate:latest --knexfile src/config/knexfile.js

# Isi data demo
docker compose exec backend npx knex seed:run --knexfile src/config/knexfile.js
```

### 4.4 Akses Aplikasi

| Service   | URL                       |
|-----------|---------------------------|
| Frontend  | http://localhost:8080      |
| Backend API | http://localhost:3000/api/health |
| MailHog   | http://localhost:8025      |

Login demo: `admin` / `password123`

### 4.5 Stop Services

```powershell
# Stop semua
docker compose down

# Stop dan hapus data (reset database)
docker compose down -v
```

---

## 5. Menjalankan Test

### 5.1 Prasyarat untuk Test

Test backend memerlukan Node.js terinstall di mesin lokal.

```powershell
cd "D:\HR APP"

# Pastikan dependencies terinstall
npm install
```

### 5.2 Unit Test (Backend)

```powershell
cd "D:\HR APP\backend"

# Jalankan semua test dengan coverage report
npx cross-env NODE_OPTIONS="--experimental-vm-modules" npx jest --coverage

# Atau di Windows PowerShell langsung:
$env:NODE_OPTIONS="--experimental-vm-modules"; npx jest --coverage
```

> **Catatan**: Test unit yang ada saat ini (`tests/utils.test.js` dan
> `tests/validators.test.js`) menguji utility functions dan validator schemas.
> Test ini TIDAK memerlukan database — bisa langsung dijalankan.

**Output yang diharapkan:**

```
PASS  tests/utils.test.js
  Pagination Helper
    ✓ parsePagination returns defaults for empty query
    ✓ parsePagination parses valid values
    ✓ paginate formats response correctly
  Error Classes
    ✓ AppError has correct properties
    ✓ NotFoundError defaults to 404
    ...

Test Suites: 2 passed, 2 total
Tests:       12 passed, 12 total

----------|---------|----------|---------|---------|
File      | % Stmts | % Branch | % Funcs | % Lines |
----------|---------|----------|---------|---------|
All files |   ...   |   ...    |   ...   |   ...   |
```

### 5.3 Lint Check

```powershell
cd "D:\HR APP\backend"

# Cek lint errors
npx eslint src/

# Auto-fix yang bisa diperbaiki otomatis
npx eslint src/ --fix
```

### 5.4 Frontend Build Test

```powershell
cd "D:\HR APP\frontend"

# Test build (pastikan tidak ada error)
npm run build
```

**Output yang berhasil:**

```
vite v5.x.x building for production...
✓ 45 modules transformed.
dist/index.html           0.42 kB │ gzip:  0.28 kB
dist/assets/index-xxx.css  8.12 kB │ gzip:  2.31 kB
dist/assets/index-xxx.js  185.2 kB │ gzip: 62.14 kB
✓ built in 3.21s
```

### 5.5 Test via Docker (Integration)

Jika Docker Desktop sudah running:

```powershell
cd "D:\HR APP"

# Build & jalankan
docker compose up -d --build

# Tunggu sebentar, lalu cek health
Invoke-RestMethod http://localhost:3000/api/health

# Output: { status: 'ok', timestamp: '...', uptime: ... }
```

---

## 6. Build & Deploy di TrueNAS

### 6.1 Persiapan Server

SSH ke TrueNAS:

```bash
ssh root@IP_TRUENAS
```

Pastikan Docker berjalan:

```bash
systemctl status docker
# Jika tidak aktif:
systemctl start docker
systemctl enable docker
```

### 6.2 Upload Source Code

(Ikuti salah satu opsi di [Bagian 2](#2-clone--copy-source-code))

```bash
cd /mnt/pool/apps/hr-app

# Verifikasi struktur folder
ls -la
# Output harus menampilkan:
#   backend/
#   frontend/
#   docker-compose.yml
#   package.json
#   README.md
#   .gitignore
```

### 6.3 Konfigurasi Production

```bash
# Copy & edit environment
cp backend/.env.example backend/.env
nano backend/.env
```

Edit sesuai panduan di [Bagian 3](#3-konfigurasi-environment).

**Update docker-compose.yml untuk production:**

```bash
nano docker-compose.yml
```

Ubah baris berikut:

```yaml
# Pada service backend, ganti target build:
  backend:
    build:
      context: ./backend
      target: production          # ← GANTI dari "development" ke "production"

# Ubah semua password agar sesuai
```

### 6.4 Build Docker Images

```bash
cd /mnt/pool/apps/hr-app

# Build semua image (pertama kali akan lama, 5-15 menit)
docker compose build --no-cache

# Output per-service:
#   ✓ postgres — pulled (image from Docker Hub)
#   ✓ redis — pulled
#   ✓ backend — built
#   ✓ frontend — built
#   ✓ mailhog — pulled
```

**Apa yang terjadi saat build:**

| Service  | Proses Build |
|----------|-------------|
| backend  | Install Node.js 20 → npm install → copy source code → prune dev dependencies |
| frontend | Install Node.js 20 → npm install → `vite build` (compile Vue+Tailwind) → copy ke nginx |
| postgres | Download image dari Docker Hub (tidak perlu build) |
| redis    | Download image dari Docker Hub |
| mailhog  | Download image dari Docker Hub |

### 6.5 Start Semua Service

```bash
# Jalankan di background
docker compose up -d

# Cek status semua container
docker compose ps
```

**Output yang diharapkan:**

```
NAME            IMAGE                    STATUS                    PORTS
hr-postgres     postgres:16-alpine       Up (healthy)              0.0.0.0:5432->5432/tcp
hr-redis        redis:7-alpine           Up (healthy)              0.0.0.0:6379->6379/tcp
hr-backend      hr-app-backend           Up                        0.0.0.0:3000->3000/tcp
hr-frontend     hr-app-frontend          Up                        0.0.0.0:8080->80/tcp
hr-mailhog      mailhog/mailhog:latest   Up                        0.0.0.0:8025->8025/tcp
```

**Pastikan semua STATUS = "Up"**. Jika ada yang "Restarting" atau "Exited", lihat [Troubleshooting](#10-troubleshooting).

### 6.6 Cek Log

```bash
# Semua log
docker compose logs -f

# Log backend saja
docker compose logs -f backend

# Log 50 baris terakhir
docker compose logs --tail=50 backend
```

---

## 7. Inisialisasi Database

> Langkah ini WAJIB dilakukan **hanya sekali** setelah pertama kali deploy.

### 7.1 Jalankan Migrasi

```bash
cd /mnt/pool/apps/hr-app

# Buat tabel-tabel database
docker compose exec backend node node_modules/.bin/knex migrate:latest --knexfile src/config/knexfile.js
```

**Output yang berhasil:**

```
Using environment: production
Batch 1 run: 2 migrations
  - 20260224_001_initial_schema.js
  - 20260224_002_materialized_views.js
```

Ini membuat:
- 11 tabel: `tenants`, `users`, `employees`, `projects`, `allocations`, `tasks`, `timesheets`, `non_project_activities`, `work_calendar`, `notifications`, `audit_logs`
- 2 materialized views: `mv_employee_utilization`, `mv_project_cost`
- Index untuk query performance

### 7.2 Isi Data Demo

```bash
docker compose exec backend node node_modules/.bin/knex seed:run --knexfile src/config/knexfile.js
```

**Output:**

```
Using environment: production
Ran 1 seed files
  - 001_demo_data.js
```

Ini membuat:
- 1 tenant (Demo Company)
- 7 user accounts
- 5 employees
- 3 projects
- 5 allocations
- Timesheet data sampel

### 7.3 Verifikasi Database

```bash
# Masuk ke PostgreSQL CLI
docker compose exec postgres psql -U hr_admin -d hr_manhour

# Di dalam psql, jalankan:
\dt
# Output: list semua tabel

SELECT username, role FROM users;
# Output: 7 user accounts

SELECT name, status FROM projects;
# Output: 3 projects

# Keluar dari psql
\q
```

---

## 8. Verifikasi Deployment

### 8.1 Test API Health

```bash
# Dari server TrueNAS:
curl http://localhost:3000/api/health

# Output:
# {"status":"ok","timestamp":"2026-02-24T...","uptime":...}
```

### 8.2 Test dari Browser

Buka browser di komputer Anda:

| Halaman       | URL                                   |
|---------------|---------------------------------------|
| Aplikasi      | `http://IP_TRUENAS:8080`              |
| API Health    | `http://IP_TRUENAS:3000/api/health`   |
| MailHog       | `http://IP_TRUENAS:8025`              |

> Ganti `IP_TRUENAS` dengan IP address server Anda (contoh: `192.168.1.100`)

### 8.3 Login Test

1. Buka `http://IP_TRUENAS:8080`
2. Halaman login akan muncul
3. Login dengan akun demo:

| Username    | Password     | Role            | Bisa Akses                   |
|-------------|-------------|-----------------|-------------------------------|
| `admin`     | `password123` | Super Admin    | Semua menu                    |
| `hr_admin`  | `password123` | HR Admin       | Employee, Timesheet, Reports  |
| `pm_john`   | `password123` | Project Manager| Projects, Timesheet, Dashboard|
| `emp_alice`  | `password123` | Employee       | Timesheet (sendiri), Dashboard|
| `emp_bob`   | `password123` | Employee       | Timesheet (sendiri), Dashboard|
| `finance`   | `password123` | Finance        | Reports, Dashboard            |
| `viewer`    | `password123` | Viewer         | Dashboard (read-only)         |

### 8.4 Checklist Verifikasi

- [ ] Halaman login muncul di browser
- [ ] Login dengan `admin` / `password123` berhasil
- [ ] Dashboard menampilkan KPI cards
- [ ] Halaman Employees menampilkan 5 employee
- [ ] Halaman Projects menampilkan 3 project
- [ ] Halaman Timesheets bisa menambah entry baru
- [ ] API Health check return `status: ok`

---

## 9. Operasional & Maintenance

### 9.1 Command Cheat Sheet

```bash
cd /mnt/pool/apps/hr-app

# ── Start / Stop ──
docker compose up -d          # Start di background
docker compose down            # Stop semua
docker compose restart         # Restart semua
docker compose restart backend # Restart satu service

# ── Logs ──
docker compose logs -f              # Real-time semua
docker compose logs -f backend      # Real-time backend saja
docker compose logs --tail=100      # 100 baris terakhir

# ── Status ──
docker compose ps                   # Status container
docker compose top                  # Proses yang berjalan

# ── Database ──
docker compose exec postgres psql -U hr_admin -d hr_manhour   # Masuk PostgreSQL CLI
docker compose exec backend node node_modules/.bin/knex migrate:latest --knexfile src/config/knexfile.js  # Migrasi baru
```

### 9.2 Backup Database

**Manual Backup:**

```bash
# Buat folder backup
mkdir -p /mnt/pool/apps/backups

# Backup database
docker compose exec -T postgres pg_dump -U hr_admin hr_manhour > /mnt/pool/apps/backups/hr_backup_$(date +%Y%m%d_%H%M%S).sql

# Verifikasi
ls -la /mnt/pool/apps/backups/
```

**Restore dari Backup:**

```bash
# Restore (HATI-HATI: ini akan menimpa data yang ada!)
cat /mnt/pool/apps/backups/hr_backup_20260224_120000.sql | docker compose exec -T postgres psql -U hr_admin hr_manhour
```

**Auto Backup (Cron Job):**

```bash
# Edit crontab
crontab -e

# Tambahkan baris ini (backup setiap hari jam 2 pagi, simpan 30 hari):
0 2 * * * cd /mnt/pool/apps/hr-app && docker compose exec -T postgres pg_dump -U hr_admin hr_manhour > /mnt/pool/apps/backups/hr_backup_$(date +\%Y\%m\%d).sql && find /mnt/pool/apps/backups -name "hr_backup_*.sql" -mtime +30 -delete
```

### 9.3 Update Aplikasi

Ketika ada perubahan code:

```bash
cd /mnt/pool/apps/hr-app

# Jika pakai Git:
git pull origin main

# Jika copy manual: upload file baru, overwrite yang lama

# Rebuild & restart
docker compose up -d --build

# Jalankan migrasi baru (jika ada perubahan database)
docker compose exec backend node node_modules/.bin/knex migrate:latest --knexfile src/config/knexfile.js
```

### 9.4 Monitoring Resource

```bash
# CPU & Memory per container
docker stats

# Output:
# CONTAINER     CPU %   MEM USAGE / LIMIT     MEM %
# hr-backend    0.50%   120MiB / 2GiB         5.86%
# hr-postgres   0.30%   80MiB / 2GiB          3.91%
# hr-redis      0.10%   10MiB / 2GiB          0.49%
# hr-frontend   0.01%   5MiB / 2GiB           0.24%

# Disk usage Docker
docker system df
```

### 9.5 GANTI PASSWORD Default!

> **PENTING!** Setelah deployment berhasil, segera ganti password default.

1. Login sebagai `admin`
2. Ubah password melalui API:

```bash
curl -X POST http://IP_TRUENAS:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'

# Catat token dari response, lalu:
curl -X PUT http://IP_TRUENAS:3000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_DARI_LOGIN" \
  -d '{"current_password":"password123","new_password":"PasswordBaruYangKuat123!"}'
```

Lakukan untuk semua akun yang akan digunakan.

---

## 10. Troubleshooting

### Container tidak mau start

```bash
# Lihat log error detail
docker compose logs backend
docker compose logs postgres

# Masalah umum:
# 1. Port sudah dipakai → ganti port di docker-compose.yml
# 2. Memory kurang → cek: free -h
# 3. Disk penuh → cek: df -h
```

### Backend terus restart

```bash
docker compose logs --tail=50 backend

# Kemungkinan penyebab:
# - Database belum ready → tunggu postgres healthy dulu
# - Environment variable salah → cek .env dan docker-compose.yml
# - Port konflik → pastikan port 3000 tidak dipakai service lain
```

### Tidak bisa akses dari browser

```bash
# Cek apakah container running
docker compose ps

# Cek firewall (TrueNAS SCALE)
iptables -L -n | grep 8080

# Cek apakah port listen
ss -tlnp | grep 8080

# Pastikan tidak ada firewall yang memblokir port 8080
# Di TrueNAS UI → System → Advanced → bisa cek firewall rules
```

### Database error "relation does not exist"

```bash
# Migrasi belum dijalankan! Jalankan:
docker compose exec backend node node_modules/.bin/knex migrate:latest --knexfile src/config/knexfile.js
```

### Reset total (mulai dari awal)

```bash
cd /mnt/pool/apps/hr-app

# Stop & hapus semua container + data (DATABASE TERHAPUS!)
docker compose down -v

# Build ulang dan start
docker compose up -d --build

# Jalankan migrasi & seed ulang
docker compose exec backend node node_modules/.bin/knex migrate:latest --knexfile src/config/knexfile.js
docker compose exec backend node node_modules/.bin/knex seed:run --knexfile src/config/knexfile.js
```

### Container sudah running tapi frontend blank/error

```bash
# Cek apakah frontend build berhasil
docker compose logs frontend

# Cek nginx config
docker compose exec frontend cat /etc/nginx/conf.d/default.conf

# Rebuild frontend saja
docker compose build --no-cache frontend
docker compose up -d frontend
```

### Check semua port yang digunakan

| Port  | Service      | Keterangan               |
|-------|-------------|--------------------------|
| 3000  | Backend API  | Express.js               |
| 5432  | PostgreSQL   | Database                 |
| 6379  | Redis        | Cache & Queue            |
| 8080  | Frontend     | Nginx (Vue SPA)          |
| 8025  | MailHog UI   | Email testing (dev only) |
| 1025  | MailHog SMTP | SMTP testing             |

> Jika port bentrok, ubah mapping di `docker-compose.yml`.
> Contoh: `"9090:80"` untuk ganti frontend ke port 9090.

---

## Lampiran: Diagram Alur Deployment

```
 ┌──────────────────────────────────────────────────┐
 │              KOMPUTER DEVELOPMENT                │
 │                                                  │
 │  1. Install Node.js 20                           │
 │  2. npm install (install dependencies)           │
 │  3. Jalankan test: npx jest                      │
 │  4. Jalankan lint: npx eslint src/               │
 │  5. Build frontend: npm run build (di /frontend) │
 │  6. git push / SCP ke server                     │
 │                                                  │
 └───────────────────────┬──────────────────────────┘
                         │
                         ▼
 ┌──────────────────────────────────────────────────┐
 │                SERVER TRUENAS                    │
 │                                                  │
 │  1. git pull / terima file                       │
 │  2. Edit backend/.env (production secrets)       │
 │  3. docker compose build --no-cache              │
 │  4. docker compose up -d                         │
 │  5. docker compose exec backend ... migrate      │
 │  6. docker compose exec backend ... seed          │
 │  7. Verifikasi: curl localhost:3000/api/health   │
 │  8. Buka browser: http://IP:8080                 │
 │                                                  │
 │  ┌─────────┐ ┌───────┐ ┌─────────┐ ┌──────────┐ │
 │  │Postgres │ │ Redis │ │ Backend │ │ Frontend │ │
 │  │  :5432  │ │ :6379 │ │  :3000  │ │  :8080   │ │
 │  └─────────┘ └───────┘ └─────────┘ └──────────┘ │
 └──────────────────────────────────────────────────┘
```

---

**Pertanyaan?** Jika menemui masalah, cek log dengan `docker compose logs -f` dan lihat bagian [Troubleshooting](#10-troubleshooting).
