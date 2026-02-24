# 🚀 Panduan Deploy HR Man-Hour Monitoring System

**Target Server:** TrueNAS Scale  
**CDN/Proxy:** Cloudflare  

| Service    | Subdomain                          | Port |
|------------|-------------------------------------|------|
| Frontend   | `eleva.hadrianjg.web.id`            | 8888 |
| Backend API| `eleva-api.hadrianjg.web.id`        | 3001 |
| PostgreSQL | `eleva-postgress.hadrianjg.web.id`  | 5432 |
| Redis      | `eleva-redis.hadrianjg.web.id`      | 6379 |

---

## Daftar Isi

1. [Prasyarat](#1-prasyarat)
2. [Persiapan TrueNAS Scale](#2-persiapan-truenas-scale)
3. [Upload Project ke Server](#3-upload-project-ke-server)
4. [Konfigurasi Environment](#4-konfigurasi-environment)
5. [Build & Jalankan Docker](#5-build--jalankan-docker)
6. [Migrasi & Seed Database](#6-migrasi--seed-database)
7. [Konfigurasi Cloudflare](#7-konfigurasi-cloudflare)
8. [Verifikasi Deployment](#8-verifikasi-deployment)
9. [Maintenance & Troubleshooting](#9-maintenance--troubleshooting)

---

## 1. Prasyarat

### Di TrueNAS Scale:
- ✅ TrueNAS Scale sudah terinstall dan bisa diakses via SSH
- ✅ Docker & Docker Compose sudah tersedia (bawaan TrueNAS Scale)
- ✅ Port **8888** tidak digunakan oleh service lain
- ✅ Akses SSH ke server (atau Shell via Web UI TrueNAS)

### Di Cloudflare:
- ✅ Domain `hadrianjg.web.id` sudah terdaftar di Cloudflare
- ✅ Nameserver sudah mengarah ke Cloudflare

### Di PC Lokal:
- ✅ Tool SCP/SFTP (WinSCP, FileZilla, atau `scp` CLI)
- ✅ SSH client (PuTTY atau Windows Terminal)

---

## 2. Persiapan TrueNAS Scale

### 2.1 Login ke TrueNAS via SSH

```bash
ssh root@<IP_TRUENAS>
```

> Atau gunakan **Shell** dari Web UI TrueNAS: **System → Shell**

### 2.2 Buat Direktori Aplikasi

Pilih dataset/pool yang sesuai. Contoh menggunakan pool `tank`:

```bash
# Buat direktori untuk aplikasi
mkdir -p /mnt/tank/apps/hr-manhour
cd /mnt/tank/apps/hr-manhour
```

> ⚠️ Sesuaikan `/mnt/tank/` dengan nama pool TrueNAS Anda.  
> Cek pool yang tersedia: `zpool list` atau lihat dari Web UI → **Storage**

### 2.3 Pastikan Docker Tersedia

```bash
docker --version
docker compose version
```

Jika belum ada, aktifkan dari Web UI: **Apps → Settings → Choose Pool** (pilih pool `tank`), ini akan mengaktifkan Docker daemon.

---

## 3. Upload Project ke Server

### Opsi A: SCP dari PC Lokal (Rekomendasi)

Dari **Windows PowerShell** di PC lokal:

```powershell
# Compress project terlebih dahulu (exclude node_modules)
cd "D:\HR APP"
tar --exclude='node_modules' --exclude='.git' --exclude='pgdata' -czf hr-manhour.tar.gz .

# Upload ke TrueNAS
scp hr-manhour.tar.gz root@<IP_TRUENAS>:/mnt/tank/apps/hr-manhour/
```

Di **server TrueNAS**:

```bash
cd /mnt/tank/apps/hr-manhour
tar -xzf hr-manhour.tar.gz
rm hr-manhour.tar.gz
```

### Opsi B: Git Clone (Jika ada repo)

```bash
cd /mnt/tank/apps/hr-manhour
git clone <URL_REPO> .
```

### Opsi C: WinSCP / FileZilla

1. Buka WinSCP → New Session
2. Protocol: SFTP
3. Host: `<IP_TRUENAS>`, Port: 22
4. Username: `root`, Password: password TrueNAS
5. Upload seluruh folder `D:\HR APP\*` ke `/mnt/tank/apps/hr-manhour/`
6. **Jangan upload** folder `node_modules/`

---

## 4. Konfigurasi Environment

### 4.1 File .env.production Sudah Tersedia

File `.env.production` sudah ada di dalam project dengan nilai yang sudah diisi. **Tidak perlu membuat ulang.**

Jika ingin mengecek atau mengubah (misalnya SMTP):

```bash
cd /mnt/tank/apps/hr-manhour
nano .env.production
```

Isi saat ini:

```env
# ── Database ─────────────────────────────────
DB_NAME=eleva-db
DB_USER=eleva-admin
DB_PASSWORD=8iWEnU8mMejzcg2cF+AEO+NhM7HhCiXekjb7RfLwukg=

# ── Redis ────────────────────────────────────
REDIS_PASSWORD=ZiUdDIF6Q77o03L1n53a5Bwyrx0G+h3V

# ── JWT Secrets ──────────────────────────────
JWT_SECRET=770307e8c87a248f3aa7a21b8adeac13de043febfcd73fb232fcef29fcdfb46a0a561ada593a
JWT_REFRESH_SECRET=a56bcf1f64798b31325360f53106a8f761d6737a73e76c934465b39226f9ad60f6c4

# ── SMTP (sesuaikan dengan akun email Anda) ──
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=email@gmail.com
SMTP_PASS=app-password-gmail
SMTP_FROM=noreply@hadrianjg.web.id
```

> ⚠️ **Yang perlu disesuaikan:** hanya bagian SMTP jika ingin kirim email. Sisanya sudah siap.

### 4.2 Routing Frontend → Backend

Routing sudah dikonfigurasi otomatis dengan **subdomain terpisah**:

- **Frontend** (`eleva.hadrianjg.web.id`) → port 8888
  - Memanggil API via `https://eleva-api.hadrianjg.web.id/api/v1` (hardcoded saat build)
- **Backend API** (`eleva-api.hadrianjg.web.id`) → port 3001
  - CORS mengizinkan origin dari `https://eleva.hadrianjg.web.id`
  - Socket.IO juga mengarah ke subdomain API
- **PostgreSQL** (`eleva-postgress.hadrianjg.web.id`) → port 5432 (DNS-only, tidak melalui Cloudflare proxy)
- **Redis** (`eleva-redis.hadrianjg.web.id`) → port 6379 (DNS-only, tidak melalui Cloudflare proxy)

```
Browser → https://eleva.hadrianjg.web.id
    → Cloudflare (SSL) → Origin Rule port 8888
        → Nginx (hr-frontend container)
            → Serve Vue SPA

Vue SPA → https://eleva-api.hadrianjg.web.id/api/v1/*
    → Cloudflare (SSL) → Origin Rule port 3001
        → Express (hr-backend container :3000)

DBA Tools → eleva-postgress.hadrianjg.web.id:5432  (DNS-only)
    → Langsung ke TrueNAS → PostgreSQL container

Redis CLI → eleva-redis.hadrianjg.web.id:6379  (DNS-only)
    → Langsung ke TrueNAS → Redis container
```

**Tidak perlu mengubah file apapun.** Tinggal build dan deploy.

---

## 5. Build & Jalankan Docker

### 5.1 Build Images

```bash
cd /mnt/tank/apps/hr-manhour
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache
```

> ⏳ Build pertama kali membutuhkan waktu ±5-10 menit tergantung koneksi internet.

### 5.2 Jalankan Semua Service

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

### 5.3 Cek Status Container

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

Output yang diharapkan:

```
NAME           STATUS                 PORTS
hr-postgres    Up (healthy)           0.0.0.0:5432->5432/tcp
hr-redis       Up (healthy)           0.0.0.0:6379->6379/tcp
hr-backend     Up                     0.0.0.0:3001->3000/tcp
hr-frontend    Up                     0.0.0.0:8888->80/tcp
```

> ✅ Port **8888** (frontend), **3001** (backend API), **5432** (PostgreSQL), **6379** (Redis) terbuka.

### 5.4 Cek Logs

```bash
# Lihat semua logs
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f

# Hanya backend
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f backend

# Hanya frontend
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f frontend
```

---

## 6. Seed Database (Opsional)

Migrasi database **otomatis dijalankan** saat backend pertama kali start. Tidak perlu command manual.

Log backend akan menampilkan:
```
Database migrations completed
```

### 6.1 Jalankan Seed Data Demo (Opsional)

> ⚠️ **Hanya jalankan ini untuk pertama kali** atau jika ingin data demo. Jangan jalankan di production yang sudah ada data real.

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend \
  npx knex seed:run --knexfile src/config/knexfile.js
```

### 6.2 Verifikasi Database

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec postgres \
  psql -U eleva-admin -d eleva-db -c "\dt"
```

Seharusnya menampilkan tabel: `users`, `employees`, `projects`, `allocations`, `timesheets`, `audit_logs`, `tasks`, dll.

---

## 7. Konfigurasi Cloudflare

### 7.1 Arsitektur Jaringan

```
Internet → Cloudflare (SSL)
    ├─ eleva.hadrianjg.web.id          → IP:8888  → Nginx (Frontend)
    ├─ eleva-api.hadrianjg.web.id      → IP:3001  → Express (Backend)
    ├─ eleva-postgress.hadrianjg.web.id → IP:5432  → PostgreSQL (DNS-only)
    └─ eleva-redis.hadrianjg.web.id    → IP:6379  → Redis (DNS-only)
```

### 7.2 Tambahkan DNS Records

1. Login ke [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Pilih domain **hadrianjg.web.id**
3. Buka **DNS → Records → Add Record**

| Type | Name              | Content (Value)       | Proxy Status    | TTL  |
|------|-------------------|-----------------------|-----------------|------|
| A    | `eleva`           | `<IP_PUBLIC_TRUENAS>` | ✅ Proxied       | Auto |
| A    | `eleva-api`       | `<IP_PUBLIC_TRUENAS>` | ✅ Proxied       | Auto |
| A    | `eleva-postgress` | `<IP_PUBLIC_TRUENAS>` | ⚠️ DNS only     | Auto |
| A    | `eleva-redis`     | `<IP_PUBLIC_TRUENAS>` | ⚠️ DNS only     | Auto |

> 💡 **IP_PUBLIC_TRUENAS** = IP publik jaringan tempat TrueNAS berada.
> Cek IP publik dari server: `curl -4 ifconfig.me`

> ⚠️ **PostgreSQL & Redis harus DNS-only** (awan abu-abu) karena Cloudflare hanya bisa proxy HTTP/HTTPS.
> Pastikan keduanya diamankan dengan password yang kuat (sudah dikonfigurasi).

### 7.3 Konfigurasi SSL/TLS

1. Buka **SSL/TLS → Overview**
2. Set mode: **Full** (bukan Full Strict, karena kita tidak pakai SSL di server)

   ```
   ┌──────────────┐     HTTPS      ┌───────────┐    HTTP     ┌──────────┐
   │   Browser    │ ──────────────→ │ Cloudflare │ ─────────→ │ TrueNAS  │
   │              │    (SSL/TLS)    │   Proxy    │             │          │
   └──────────────┘                 └───────────┘             └──────────┘
   ```

   > Berlaku untuk `eleva` dan `eleva-api`. PostgreSQL & Redis menggunakan DNS-only (tidak melalui SSL Cloudflare).

### 7.4 Konfigurasi Port Forwarding (Router)

Karena TrueNAS biasanya berada di jaringan lokal, perlu **port forwarding** di router:

1. Login ke router (biasanya `192.168.1.1`)
2. Buka menu **Port Forwarding / NAT / Virtual Server**
3. Tambahkan rules:

| Nama             | Protocol | External Port | Internal IP         | Internal Port |
|------------------|----------|---------------|---------------------|---------------|
| HR-Frontend      | TCP      | 8888          | `<IP_LOKAL_TRUENAS>` | 8888          |
| HR-Backend-API   | TCP      | 3001          | `<IP_LOKAL_TRUENAS>` | 3001          |
| HR-PostgreSQL    | TCP      | 5432          | `<IP_LOKAL_TRUENAS>` | 5432          |
| HR-Redis         | TCP      | 6379          | `<IP_LOKAL_TRUENAS>` | 6379          |

> 💡 Cek IP lokal TrueNAS: `hostname -I` atau lihat dari Web UI TrueNAS → **Network**
> 
> ⚠️ **Catatan keamanan:** Port 5432 dan 6379 terbuka ke internet. Pastikan password kuat sudah diset
> (sudah dikonfigurasi di `.env.production`). Pertimbangkan menggunakan firewall rules untuk
> membatasi akses hanya dari IP tertentu.

### 7.5 Cloudflare Origin Rules (Port Mapping)

Karena Cloudflare secara default mengarahkan ke port 80/443, kita perlu **Origin Rules** untuk setiap subdomain:

1. Buka **Rules → Origin Rules → Create Rule**

#### Rule 1: Frontend (port 8888)

- **Rule Name:** `HR Frontend Port 8888`
- **When incoming requests match:**
  - Field: `Hostname` → Operator: `equals` → Value: `eleva.hadrianjg.web.id`
- **Then:** Destination Port → Override → `8888`
- Klik **Deploy**

#### Rule 2: Backend API (port 3001)

- **Rule Name:** `HR Backend API Port 3001`
- **When incoming requests match:**
  - Field: `Hostname` → Operator: `equals` → Value: `eleva-api.hadrianjg.web.id`
- **Then:** Destination Port → Override → `3001`
- Klik **Deploy**

> 📝 PostgreSQL dan Redis tidak perlu Origin Rule karena menggunakan DNS-only (koneksi langsung, bukan via Cloudflare proxy).

### 7.6 Pengaturan Cloudflare Tambahan (Opsional tapi Direkomendasikan)

#### a. Page Rules atau Cache Rules
1. Buka **Rules → Page Rules → Create Page Rule**
2. URL: `eleva.hadrianjg.web.id/api/*`
3. Setting: **Cache Level → Bypass**
4. Ini memastikan API request tidak di-cache oleh Cloudflare

#### b. Security Headers
1. Buka **Rules → Transform Rules → Modify Response Header**
2. Tambahkan:
   - `X-Frame-Options: DENY`
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`

#### c. Firewall / WAF (Web Application Firewall)
- Biarkan **default ON** untuk perlindungan dasar
- Di **Security → WAF**, pastikan managed rules aktif

---

## 8. Verifikasi Deployment

### 8.1 Test dari Server Lokal

```bash
# Test Frontend
curl http://localhost:8888
# Seharusnya menampilkan HTML dari Vue app

# Test Backend API (langsung via port 3001)
curl http://localhost:3001/api/v1/health
# Seharusnya menampilkan: {"status":"ok",...}

# Test CORS header
curl -I -H "Origin: https://eleva.hadrianjg.web.id" http://localhost:3001/api/v1/health
# Seharusnya ada header: access-control-allow-origin: https://eleva.hadrianjg.web.id

# Test PostgreSQL
docker compose -f docker-compose.prod.yml --env-file .env.production exec postgres \
  psql -U eleva-admin -d eleva-db -c "SELECT 1"

# Test Redis
docker compose -f docker-compose.prod.yml --env-file .env.production exec redis \
  redis-cli -a ZiUdDIF6Q77o03L1n53a5Bwyrx0G+h3V ping
```

### 8.2 Test dari Browser

1. Buka: **https://eleva.hadrianjg.web.id** → Halaman Login
2. Buka: **https://eleva-api.hadrianjg.web.id/api/v1/health** → JSON status
3. Login dengan akun demo (jika sudah seed):
   - **Super Admin:** `admin@demo.com` / `password123`
   - **HR Admin:** `hr@demo.com` / `password123`
   - **Project Manager:** `pm@demo.com` / `password123`
   - **Employee:** `john@demo.com` / `password123`

### 8.3 Checklist Verifikasi

- [ ] Halaman login muncul dengan benar
- [ ] Bisa login dengan akun demo
- [ ] Dashboard menampilkan data (admin = company dashboard, employee = personal dashboard)
- [ ] Menu navigasi dalam Bahasa Indonesia
- [ ] URL menampilkan `https://` (SSL dari Cloudflare)
- [ ] API endpoint bekerja: `https://eleva-api.hadrianjg.web.id/api/v1/health`
- [ ] WebSocket/Socket.IO terhubung ke `eleva-api.hadrianjg.web.id` (cek di browser DevTools → Network → WS)
- [ ] PostgreSQL bisa diakses via: `psql -h eleva-postgress.hadrianjg.web.id -U eleva-admin -d eleva-db`
- [ ] Redis bisa diakses via: `redis-cli -h eleva-redis.hadrianjg.web.id -a <password> ping`

---

## 9. Maintenance & Troubleshooting

### 9.1 Command-Command Penting

```bash
# Alias (tambahkan ke ~/.bashrc untuk kemudahan)
alias hrdc="docker compose -f /mnt/tank/apps/hr-manhour/docker-compose.prod.yml --env-file /mnt/tank/apps/hr-manhour/.env.production"

# Restart semua service
hrdc restart

# Restart hanya backend
hrdc restart backend

# Stop semua
hrdc down

# Start semua
hrdc up -d

# Rebuild setelah update code
hrdc build --no-cache backend frontend
hrdc up -d

# Lihat logs real-time
hrdc logs -f

# Masuk ke container backend (debug)
hrdc exec backend sh

# Masuk ke database
hrdc exec postgres psql -U eleva-admin -d eleva-db

# Backup database
hrdc exec postgres pg_dump -U eleva-admin eleva-db > backup_$(date +%Y%m%d).sql

# Restore database
cat backup_20260225.sql | hrdc exec -T postgres psql -U eleva-admin -d eleva-db
```

### 9.2 Update Aplikasi

Ketika ada perubahan kode:

```bash
cd /mnt/tank/apps/hr-manhour

# Upload file baru (dari PC lokal via SCP) atau git pull
# ...

# Rebuild & restart
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache backend frontend
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# Migrasi otomatis jalan saat backend start, tidak perlu command manual
```

### 9.3 Auto-Start Setelah Reboot

Docker di TrueNAS Scale otomatis start saat boot karena kita menggunakan `restart: unless-stopped`. Namun pastikan:

1. **Apps Service** aktif di TrueNAS: **System → Services → Docker** → ON + Start Automatically
2. Container akan otomatis start setelah TrueNAS reboot

### 9.4 Backup Otomatis Database

Buat cron job di TrueNAS untuk backup harian:

1. **System → Advanced → Cron Jobs → Add**

| Field     | Value |
|-----------|-------|
| Description | HR DB Backup Daily |
| Command   | `docker compose -f /mnt/tank/apps/hr-manhour/docker-compose.prod.yml --env-file /mnt/tank/apps/hr-manhour/.env.production exec -T postgres pg_dump -U eleva-admin eleva-db > /mnt/tank/backups/hr-manhour/backup_$(date +\%Y\%m\%d).sql` |
| Run As User | root |
| Schedule  | Daily at 02:00 AM |

```bash
# Buat direktori backup
mkdir -p /mnt/tank/backups/hr-manhour
```

### 9.5 Monitoring Resource

```bash
# Cek penggunaan resource container
docker stats hr-backend hr-frontend hr-postgres hr-redis

# Cek disk usage
docker system df

# Bersihkan image/cache lama
docker system prune -a --volumes
```

### 9.6 Troubleshooting Umum

| Masalah | Solusi |
|---------|--------|
| **502 Bad Gateway** di browser | Cek backend logs: `docker logs hr-backend`. Pastikan migrasi sudah jalan. |
| **Connection refused port 8888** | Cek: `docker ps` apakah `hr-frontend` running. Cek port forwarding router. |
| **Cloudflare Error 522** | Server tidak merespons. Cek: firewall TrueNAS, port forwarding, container status. |
| **Cloudflare Error 521** | Web server down. Cek: `docker ps`, pastikan semua container running. |
| **API 500 Error** | Cek backend logs. Biasanya migrasi belum jalan atau env variable salah. |
| **Login gagal** | Pastikan seed sudah dijalankan atau buat user manual via API. |
| **WebSocket tidak konek** | Pastikan Cloudflare **WebSockets** diaktifkan: Network → WebSockets → ON |
| **CSS/JS tidak load** | Clear Cloudflare cache: Caching → Configuration → Purge Everything |
| **CORS error di browser** | Pastikan `FRONTEND_URL` di docker-compose.prod.yml = `https://eleva.hadrianjg.web.id`. Rebuild backend. |

---

## Ringkasan Quick Deploy

```bash
# 1. SSH ke TrueNAS
ssh root@<IP_TRUENAS>

# 2. Setup direktori
mkdir -p /mnt/tank/apps/hr-manhour
cd /mnt/tank/apps/hr-manhour

# 3. Upload & extract project
# (dari PC: scp hr-manhour.tar.gz root@<IP>:/mnt/tank/apps/hr-manhour/)
tar -xzf hr-manhour.tar.gz && rm hr-manhour.tar.gz

# 4. File .env.production sudah ada, tidak perlu diubah
# (opsional) nano .env.production  # jika ingin ubah SMTP

# 5. Build & jalankan
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# 6. Migrasi otomatis saat backend start, cek logs:
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f backend

# 7. Seed data demo (opsional, hanya pertama kali)
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend \
  npx knex seed:run --knexfile src/config/knexfile.js

# 8. Verifikasi
curl http://localhost:3001/api/v1/health
curl http://localhost:8888

# 9. Setup Cloudflare DNS:
#    A record: eleva     → IP publik (Proxied)
#    A record: eleva-api → IP publik (Proxied)
#    A record: eleva-postgress → IP publik (DNS only)
#    A record: eleva-redis     → IP publik (DNS only)
# 10. Setup Cloudflare Origin Rules:
#    eleva.hadrianjg.web.id     → port 8888
#    eleva-api.hadrianjg.web.id → port 3001
# 11. Buka https://eleva.hadrianjg.web.id ✅
```

---

**Selesai!** Aplikasi HR Man-Hour Monitoring System sekarang live di **https://eleva.hadrianjg.web.id** 🎉

---

## 10. Deploy via TrueNAS Custom App (YAML)

Jika ingin menggunakan fitur **Custom App** di TrueNAS agar container dikelola langsung oleh TrueNAS (auto-start, monitoring via UI), ikuti langkah berikut:

### 10.1 Prasyarat

1. **TrueNAS Scale 24.04 (Dragonfish)** atau lebih baru — mendukung Docker Compose via Custom App
2. Image sudah di-build dan di-push ke registry (lihat bagian 10.2), **ATAU** build manual di server lalu gunakan image lokal
3. Pool sudah dipilih di **Apps → Settings → Choose Pool**

### 10.2 Build & Push Image ke Registry (Jika pakai registry)

Jika menggunakan Docker Hub atau registry privat:

```bash
cd /mnt/tank/apps/hr-manhour

# Login ke Docker Hub (atau registry lain)
docker login

# Build dengan tag
docker build -t USERNAME/hr-backend:latest --target production ./backend
docker build -t USERNAME/hr-frontend:latest --target production ./frontend

# Push
docker push USERNAME/hr-backend:latest
docker push USERNAME/hr-frontend:latest
```

> Ganti `USERNAME` dengan username Docker Hub Anda.

### 10.3 Install via Custom App (Docker Compose)

**TrueNAS Scale 24.04+** mendukung langsung Docker Compose:

1. Buka **Apps → Discover → Custom App** (klik tombol `Custom App`)
2. Pilih **Docker Compose**
3. **Compose File Path:** `/mnt/tank/apps/hr-manhour/docker-compose.prod.yml`
4. **Environment File Path:** `/mnt/tank/apps/hr-manhour/.env.production`
5. Nama Aplikasi: `hr-manhour`
6. Klik **Install**

TrueNAS akan membaca docker-compose.prod.yml dan menjalankan semua service secara otomatis.

### 10.4 Alternatif: Custom App (Manual Config per Container)

Jika TrueNAS Anda versi lama (sebelum 24.04) yang belum mendukung Docker Compose, Anda perlu membuat **4 Custom App** terpisah:

#### App 1: PostgreSQL

| Field | Value |
|-------|-------|
| Application Name | hr-postgres |
| Image Repository | postgres |
| Image Tag | 16-alpine |
| Container Env Variables | `POSTGRES_DB=eleva-db`, `POSTGRES_USER=eleva-admin`, `POSTGRES_PASSWORD=8iWEnU8mMejzcg2cF+AEO+NhM7HhCiXekjb7RfLwukg=` |
| Storage | Host Path Mount: `/mnt/tank/apps/hr-data/pgdata` → `/var/lib/postgresql/data` |
| Networking | Biarkan ClusterIP, port 5432 |

#### App 2: Redis

| Field | Value |
|-------|-------|
| Application Name | hr-redis |
| Image Repository | redis |
| Image Tag | 7-alpine |
| Container Args | `redis-server`, `--appendonly`, `yes`, `--requirepass`, `ZiUdDIF6Q77o03L1n53a5Bwyrx0G+h3V` |
| Storage | Host Path Mount: `/mnt/tank/apps/hr-data/redis` → `/data` |
| Networking | Biarkan ClusterIP, port 6379 |

#### App 3: Backend

| Field | Value |
|-------|-------|
| Application Name | hr-backend |
| Image Repository | `USERNAME/hr-backend` (atau image lokal) |
| Image Tag | latest |
| Container Env Variables | (semua env dari docker-compose.prod.yml backend section) |
| Networking | Biarkan ClusterIP, port 3000 |

#### App 4: Frontend

| Field | Value |
|-------|-------|
| Application Name | hr-frontend |
| Image Repository | `USERNAME/hr-frontend` (atau image lokal) |
| Image Tag | latest |
| Networking | NodePort: **8888** → Container Port **80** |

### 10.5 Rekomendasi: Tetap Gunakan Docker Compose CLI

Untuk kemudahan management, **cara paling reliable** di TrueNAS adalah tetap menggunakan Docker Compose via CLI:

```bash
# File sudah ada di /mnt/tank/apps/hr-manhour/
cd /mnt/tank/apps/hr-manhour
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

Tambahkan ke **System → Advanced → Init/Shutdown Scripts** agar auto-start:

| Field | Value |
|-------|-------|
| Description | Start HR Manhour App |
| Type | Command |
| Command | `docker compose -f /mnt/tank/apps/hr-manhour/docker-compose.prod.yml --env-file /mnt/tank/apps/hr-manhour/.env.production up -d` |
| When | Post Init |

Ini memastikan semua container otomatis start setelah TrueNAS reboot, tanpa perlu setup Custom App satu per satu.
