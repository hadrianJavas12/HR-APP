# HR Man-Hour Performance Monitoring System
# Panduan Build & Deploy

> Panduan **step-by-step** untuk menjalankan aplikasi di **lokal (development)** maupun **production (TrueNAS + Cloudflare)**.

---

## Daftar Isi

1. [Arsitektur 2 Environment](#1-arsitektur-2-environment)
2. [Prasyarat](#2-prasyarat)
3. [Development Lokal](#3-development-lokal)
4. [Production (TrueNAS + Cloudflare)](#4-production-truenas--cloudflare)
5. [Menjalankan Test](#5-menjalankan-test)
6. [Inisialisasi Database](#6-inisialisasi-database)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Arsitektur 2 Environment

Project ini memiliki **2 set konfigurasi** yang sepenuhnya terpisah:

| | **Development (Lokal)** | **Production (TrueNAS)** |
|---|---|---|
| **Compose file** | `docker-compose.yml` | `docker-compose.prod.yml` |
| **Env file** | Hardcoded di compose | `.env.production` |
| **Frontend env** | `frontend/.env.development` | `frontend/.env.production` |
| **Frontend port** | `8080` | `8888` |
| **Backend port** | `3000` | `3001` (external) |
| **Backend target** | `development` (nodemon) | `production` (node) |
| **Frontend API URL** | `/api/v1` (nginx proxy) | `https://eleva-api.hadrianjg.web.id/api/v1` |
| **Socket.IO URL** | `window.location.origin` | `https://eleva-api.hadrianjg.web.id` |
| **DB credentials** | `hr_admin` / `hr_manhour` | `eleva-admin` / `eleva-db` |
| **Redis password** | _(kosong)_ | _(strong password)_ |
| **Email** | MailHog (port 8025) | Gmail SMTP |
| **Build mode** | `VITE_MODE=development` | `VITE_MODE=production` |

### File Struktur Environment

```
HR APP/
├── docker-compose.yml          ← Lokal: docker compose up -d
├── docker-compose.prod.yml     ← Prod:  docker compose -f docker-compose.prod.yml --env-file .env.production up -d
├── .env.production             ← Secrets production (DB, Redis, JWT, SMTP)
├── frontend/
│   ├── .env.development        ← VITE_API_BASE_URL=/api/v1
│   └── .env.production         ← VITE_API_BASE_URL=https://eleva-api.hadrianjg.web.id/api/v1
└── backend/
    ├── .env                    ← Dev env (dipakai saat run tanpa Docker)
    └── Dockerfile              ← Multi-stage: development + production
```

### Diagram Alur

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  DEVELOPMENT (docker-compose.yml)                                          │
│                                                                             │
│  Browser → http://localhost:8080                                            │
│      → Nginx (frontend container)                                           │
│          → /api/*  → proxy ke backend:3000  (internal Docker network)       │
│          → /*      → serve Vue SPA (built with VITE_MODE=development)       │
│                                                                             │
│  ┌──────────┐ ┌───────┐ ┌─────────┐ ┌──────────┐ ┌─────────┐              │
│  │ Postgres │ │ Redis │ │ Backend │ │ Frontend │ │ MailHog │              │
│  │  :5432   │ │ :6379 │ │  :3000  │ │  :8080   │ │  :8025  │              │
│  └──────────┘ └───────┘ └─────────┘ └──────────┘ └─────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  PRODUCTION (docker-compose.prod.yml)                                      │
│                                                                             │
│  Browser → https://eleva.hadrianjg.web.id                                   │
│      → Cloudflare → Origin Rule port 8888 → Nginx (frontend)               │
│  Vue SPA → https://eleva-api.hadrianjg.web.id/api/v1/*                      │
│      → Cloudflare → Origin Rule port 3001 → Express (backend:3000)          │
│                                                                             │
│  ┌──────────┐ ┌───────┐ ┌─────────┐ ┌──────────┐                          │
│  │ Postgres │ │ Redis │ │ Backend │ │ Frontend │                          │
│  │  :5432   │ │ :6379 │ │  :3001  │ │  :8888   │                          │
│  └──────────┘ └───────┘ └─────────┘ └──────────┘                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Prasyarat

### Di Komputer Development (Windows)

- **Docker Desktop** — https://www.docker.com/products/docker-desktop/
  - Pastikan WSL2 backend aktif
  - Verifikasi: `docker --version` dan `docker compose version`
- **Node.js 20 LTS** _(opsional, untuk test tanpa Docker)_ — https://nodejs.org/
- **Git** _(opsional)_ — https://git-scm.com/

### Di Server Production (TrueNAS Scale)

- Docker & Docker Compose (bawaan TrueNAS Scale)
- Akses SSH atau Shell via Web UI
- Port 8888, 3001, 5432, 6379 tersedia

### Di Cloudflare

- Domain `hadrianjg.web.id` terdaftar
- Nameserver mengarah ke Cloudflare

---

## 3. Development Lokal

### 3.1 Build & Start

```powershell
cd "D:\HR APP"

# Build & jalankan semua service (pertama kali ~3-5 menit)
docker compose up -d --build

# ──── Atau terpisah: ────
# Build saja
docker compose build --no-cache

# Start saja
docker compose up -d
```

### 3.2 Cek Status

```powershell
docker compose ps
```

Output yang diharapkan:

```
NAME           STATUS          PORTS
hr-postgres    Up (healthy)    0.0.0.0:5432->5432/tcp
hr-redis       Up (healthy)    0.0.0.0:6379->6379/tcp
hr-backend     Up              0.0.0.0:3000->3000/tcp
hr-frontend    Up              0.0.0.0:8080->80/tcp
hr-mailhog     Up              0.0.0.0:1025->1025/tcp, 0.0.0.0:8025->8025/tcp
```

### 3.3 Cek Log

```powershell
# Semua service
docker compose logs -f

# Hanya backend
docker compose logs -f backend
```

Backend seharusnya menampilkan:

```
Database migrations completed
Redis initialized
Socket.IO initialized
🚀 hr-manhour-monitor running on port 3000 [development]
```

### 3.4 Seed Data Demo (Pertama Kali)

```powershell
docker compose exec backend npx knex seed:run --knexfile src/config/knexfile.js
```

### 3.5 Akses Aplikasi

| Service | URL | Keterangan |
|---------|-----|-----------|
| **Frontend** | http://localhost:8080 | Aplikasi Vue SPA |
| **Backend API** | http://localhost:3000/api/v1/health | Health check |
| **MailHog** | http://localhost:8025 | Email testing UI |

Login demo (setelah seed):

| Email | Password | Role |
|-------|----------|------|
| `admin@demo.com` | `password123` | Super Admin |
| `hr@demo.com` | `password123` | HR Admin |
| `pm@demo.com` | `password123` | Project Manager |
| `john@demo.com` | `password123` | Employee |

### 3.6 Stop / Reset

```powershell
# Stop semua
docker compose down

# Stop dan HAPUS semua data (database di-reset)
docker compose down -v
```

### 3.7 Rebuild Setelah Perubahan Kode

```powershell
# Backend berubah (auto-reload via nodemon volume mount, biasanya tidak perlu rebuild)
docker compose restart backend

# Frontend berubah (perlu rebuild karena Vite build)
docker compose build --no-cache frontend
docker compose up -d frontend

# Semua berubah
docker compose up -d --build
```

---

## 4. Production (TrueNAS + Cloudflare)

> Panduan lengkap ada di **DEPLOY-TRUENAS.md**. Berikut ringkasannya.

### 4.1 Upload Project ke TrueNAS

```powershell
# Di PC lokal — compress project
cd "D:\HR APP"
tar --exclude='node_modules' --exclude='.git' --exclude='pgdata' -czf hr-manhour.tar.gz .

# Upload via SCP
scp hr-manhour.tar.gz root@<IP_TRUENAS>:/mnt/tank/apps/hr-manhour/
```

Di TrueNAS:

```bash
cd /mnt/tank/apps/hr-manhour
tar -xzf hr-manhour.tar.gz && rm hr-manhour.tar.gz
```

### 4.2 Build & Start

```bash
cd /mnt/tank/apps/hr-manhour

# Build semua image (~5-10 menit pertama kali)
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache

# Start semua service
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

### 4.3 Cek Status & Log

```bash
# Status
docker compose -f docker-compose.prod.yml --env-file .env.production ps

# Log backend
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f backend
```

### 4.4 Seed Data Demo (Pertama Kali)

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend \
  npx knex seed:run --knexfile src/config/knexfile.js
```

### 4.5 Verifikasi

```bash
# Test backend
curl http://localhost:3001/api/v1/health

# Test frontend
curl http://localhost:8888
```

Lalu buka di browser: **https://eleva.hadrianjg.web.id**

### 4.6 Update Setelah Perubahan Kode

```bash
cd /mnt/tank/apps/hr-manhour

# Upload file baru (SCP/git pull)

# Rebuild & restart
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache backend frontend
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

### 4.7 Alias untuk Kemudahan

Tambahkan ke `~/.bashrc` di TrueNAS:

```bash
alias hrdc="docker compose -f /mnt/tank/apps/hr-manhour/docker-compose.prod.yml --env-file /mnt/tank/apps/hr-manhour/.env.production"
```

Setelah itu bisa pakai:

```bash
hrdc ps
hrdc logs -f backend
hrdc restart backend
hrdc down
hrdc up -d
hrdc build --no-cache backend frontend
```

---

## 5. Menjalankan Test

### 5.1 Unit Test (Backend)

```powershell
cd "D:\HR APP\backend"

# Install dependencies lokal (jika belum)
npm install

# Jalankan test
$env:NODE_OPTIONS="--experimental-vm-modules"; npx jest --coverage
```

### 5.2 Lint Check

```powershell
cd "D:\HR APP\backend"
npx eslint src/
```

### 5.3 Frontend Build Test

```powershell
cd "D:\HR APP\frontend"
npm install
npm run build
```

---

## 6. Inisialisasi Database

### Migrasi (Otomatis)

**Migrasi database otomatis dijalankan** saat backend pertama kali start. Tidak perlu command manual.

Verifikasi di log backend:

```
Database migrations completed
```

### Seed Data Demo

> Hanya jalankan **pertama kali** atau untuk reset data demo.

**Lokal:**

```powershell
docker compose exec backend npx knex seed:run --knexfile src/config/knexfile.js
```

**Production:**

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend \
  npx knex seed:run --knexfile src/config/knexfile.js
```

### Verifikasi Database

**Lokal:**

```powershell
docker compose exec postgres psql -U hr_admin -d hr_manhour -c "\dt"
```

**Production:**

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec postgres \
  psql -U eleva-admin -d eleva-db -c "\dt"
```

### Backup Database (Production)

```bash
# Manual backup
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres \
  pg_dump -U eleva-admin eleva-db > backup_$(date +%Y%m%d).sql

# Restore
cat backup_20260225.sql | docker compose -f docker-compose.prod.yml --env-file .env.production \
  exec -T postgres psql -U eleva-admin -d eleva-db
```

---

## 7. Troubleshooting

### Container restart loop / backend crash

```powershell
# Lihat error detail
docker compose logs --tail=50 backend
```

| Error | Penyebab | Solusi |
|-------|----------|--------|
| `Cannot find module '/app/src/index.js'` | Source tidak ter-copy ke image | Pastikan `backend/src/` ada, rebuild: `docker compose build --no-cache backend` |
| `ECONNREFUSED postgres` | DB belum ready | Tunggu postgres healthy, cek `docker compose ps` |
| `SSL connection error` | SSL dipaksa tapi DB lokal | Pastikan `DB_SSL` tidak diset atau = `false` |
| `Migration failed` | Path migrasi salah | Sudah diperbaiki (absolute path), rebuild backend |

### Frontend blank / API error

| Masalah | Solusi |
|---------|--------|
| **CORS error** di console | Cek `FRONTEND_URL` di docker-compose = URL frontend yang benar |
| **API 404** di lokal | Pastikan nginx proxy `/api/` ke `backend:3000` (cek `frontend/nginx.conf`) |
| **API 404** di production | Pastikan `VITE_API_BASE_URL` di `frontend/.env.production` benar |
| **CSS/JS tidak load** | Rebuild frontend: `docker compose build --no-cache frontend` |

### Port bentrok

```powershell
# Cek port yang dipakai
netstat -ano | findstr :8080
netstat -ano | findstr :3000

# Ubah port di docker-compose.yml jika bentrok
# Contoh: "9090:80" untuk ganti frontend ke port 9090
```

### Reset total (mulai dari awal)

**Lokal:**

```powershell
docker compose down -v
docker compose up -d --build
docker compose exec backend npx knex seed:run --knexfile src/config/knexfile.js
```

**Production:**

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production down -v
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend \
  npx knex seed:run --knexfile src/config/knexfile.js
```

---

## Ringkasan Command

### Lokal (Development)

```powershell
cd "D:\HR APP"
docker compose up -d --build          # Build & start
docker compose logs -f backend         # Lihat log
docker compose exec backend npx knex seed:run --knexfile src/config/knexfile.js  # Seed
docker compose down                    # Stop
```

Buka: **http://localhost:8080**

### Production (TrueNAS)

```bash
cd /mnt/tank/apps/hr-manhour
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f backend
```

Buka: **https://eleva.hadrianjg.web.id**

> Untuk panduan Cloudflare, port forwarding, dan konfigurasi detail production, lihat **DEPLOY-TRUENAS.md**.

