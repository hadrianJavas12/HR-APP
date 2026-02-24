# HR Man-Hour Performance Monitoring System

Production-ready HR application for monitoring employee work hours, project budgets, resource allocation, and performance KPIs.

## Tech Stack

| Layer       | Technology                                           |
|-------------|------------------------------------------------------|
| Backend     | Node.js 20 + Express.js (ES Modules)                 |
| ORM         | Knex.js (query builder) + Objection.js (ORM)         |
| Database    | PostgreSQL 16                                        |
| Cache/Queue | Redis 7 + BullMQ                                     |
| Real-time   | Socket.IO                                            |
| Auth        | JWT (access + refresh tokens) + bcryptjs              |
| Validation  | Joi                                                  |
| Frontend    | Vue 3 (Composition API) + Pinia + Vue Router          |
| UI          | Tailwind CSS 3 + Chart.js                            |
| DevOps      | Docker + docker-compose + nginx reverse proxy         |

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   nginx      │────▶│   Backend    │
│   Vue 3      │     │   (reverse   │     │   Express    │
│   SPA        │     │    proxy)    │     │   REST API   │
└─────────────┘     └──────────────┘     └──────┬───────┘
                                                 │
                         ┌───────────────────────┼───────────────────┐
                         │                       │                   │
                   ┌─────▼─────┐          ┌──────▼──────┐    ┌──────▼──────┐
                   │ PostgreSQL │          │    Redis     │    │  BullMQ     │
                   │ (primary)  │          │  (cache +    │    │  (job queue)│
                   │            │          │   sessions)  │    │             │
                   └────────────┘          └─────────────┘    └─────────────┘
```

### Backend Layers

```
Controllers → Services → Models (Objection.js) → PostgreSQL
     ↑             ↑
  Validators    Middleware (auth, tenant, rate-limit)
```

## Quick Start (Docker on TrueNAS)

### Prerequisites

- Docker & Docker Compose installed on TrueNAS
- At least 2GB RAM available
- Ports 80 (or custom) available

### 1. Clone & Configure

```bash
git clone <repository-url> hr-app
cd hr-app

# Copy and edit environment variables
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your production values:

```env
# IMPORTANT: Change these for production!
JWT_SECRET=your-super-secret-key-change-this-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-this-too
DB_PASSWORD=your-secure-database-password

# Optional: Customize thresholds
DEFAULT_OVERLOAD_THRESHOLD=110
DEFAULT_UNDERUTIL_THRESHOLD=60
DEFAULT_WORK_HOURS_PER_DAY=8
DEFAULT_WORK_DAYS_PER_WEEK=5
```

### 2. Start Services

```bash
# Build and start all services
docker compose up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f backend
```

### 3. Initialize Database

```bash
# Run migrations
docker compose exec backend node node_modules/.bin/knex migrate:latest --knexfile src/config/knexfile.js

# Seed demo data
docker compose exec backend node node_modules/.bin/knex seed:run --knexfile src/config/knexfile.js
```

### 4. Access Application

- **Frontend**: http://your-truenas-ip (port 80)
- **Backend API**: http://your-truenas-ip/api
- **Mailhog** (dev email): http://your-truenas-ip:8025

### Demo Accounts

| Username    | Password     | Role            |
|-------------|-------------|-----------------|
| admin       | password123 | super_admin     |
| hr_admin    | password123 | hr_admin        |
| pm_john     | password123 | project_manager |
| emp_alice   | password123 | employee        |
| emp_bob     | password123 | employee        |
| finance     | password123 | finance         |
| viewer      | password123 | viewer          |

## Features

### Core Modules

- **Employee Management** — CRUD with department, position, seniority, cost rates
- **Project Management** — Budget tracking (hours & cost), status workflow, team allocation
- **Timesheet Entry** — Daily hour logging with quick-add, bulk create, approval workflow
- **Resource Allocation** — Assign employees to projects with percentage & hours/week, capacity warnings
- **Dashboard & KPIs**:
  - Company-wide utilization summary
  - Overloaded / underutilized employee alerts
  - Project burn rate with cost variance
  - Per-employee and per-project drill-down dashboards
- **Reports** — Utilization, project burn, employee productivity with CSV export
- **Audit Logs** — Full trail of all create/update/delete/approve actions with old/new value diff
- **Real-time Updates** — Socket.IO notifications for approvals, warnings, alerts
- **Background Jobs** — BullMQ for materialized view refresh (hourly), overload checks (daily), report generation

### KPI Formulas

| KPI | Formula |
|-----|---------|
| Utilization Rate | (Actual Hours / Capacity Hours) × 100 |
| Budget Burn Rate | (Actual Hours / Budget Hours) × 100 |
| Cost Variance | Actual Cost − Budgeted Cost |
| Schedule Variance | Planned Hours − Actual Hours |

### Security

- JWT access tokens (15min expiry) + refresh token rotation (7 days)
- Role-based access control (RBAC) with 7 roles
- Rate limiting (200 req/15min general, 20 req/15min auth)
- Helmet security headers
- CORS configuration
- Input validation on all endpoints (Joi)
- Password hashing (bcryptjs, 12 rounds)
- Row-level multi-tenant isolation

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST   | /api/auth/login | Login |
| POST   | /api/auth/refresh | Refresh token |
| POST   | /api/auth/logout | Logout |
| GET    | /api/employees | List employees |
| POST   | /api/employees | Create employee |
| GET    | /api/employees/:id | Get employee |
| PUT    | /api/employees/:id | Update employee |
| DELETE | /api/employees/:id | Soft-delete employee |
| GET    | /api/projects | List projects |
| POST   | /api/projects | Create project |
| GET    | /api/projects/:id | Get project |
| PUT    | /api/projects/:id | Update project |
| DELETE | /api/projects/:id | Soft-delete project |
| GET    | /api/timesheets | List timesheets |
| POST   | /api/timesheets | Create timesheet |
| POST   | /api/timesheets/bulk | Bulk create |
| PUT    | /api/timesheets/:id | Update timesheet |
| POST   | /api/timesheets/:id/approve | Approve/reject |
| GET    | /api/allocations | List allocations |
| POST   | /api/allocations | Create allocation |
| PUT    | /api/allocations/:id | Update allocation |
| DELETE | /api/allocations/:id | Delete allocation |
| GET    | /api/dashboard/company | Company dashboard |
| GET    | /api/dashboard/utilization | Utilization report |
| GET    | /api/dashboard/project-burn-rates | Burn rates |
| GET    | /api/dashboard/project/:id | Project dashboard |
| GET    | /api/dashboard/employee/:id | Employee dashboard |
| GET    | /api/audit-logs | Audit logs |
| GET    | /api/notifications | Notifications |
| GET    | /api/health | Health check |

## Development

### Local Development (without Docker)

```bash
# Install dependencies
npm install

# Backend
cd backend
cp .env.example .env
# Edit .env with local DB/Redis credentials
npm run dev

# Frontend (separate terminal)
cd frontend
npm run dev
```

### Database Commands

```bash
# Create a new migration
docker compose exec backend npx knex migrate:make migration_name --knexfile src/config/knexfile.js

# Run migrations
docker compose exec backend npx knex migrate:latest --knexfile src/config/knexfile.js

# Rollback last migration
docker compose exec backend npx knex migrate:rollback --knexfile src/config/knexfile.js

# Run seeds
docker compose exec backend npx knex seed:run --knexfile src/config/knexfile.js
```

### Testing

```bash
cd backend
npm test          # Run all tests with coverage
npm run test:watch  # Watch mode
```

### Linting

```bash
cd backend
npx eslint src/     # Lint
npx eslint src/ --fix  # Auto-fix
```

## Production Deployment (TrueNAS)

### Recommended docker-compose.yml overrides

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'
services:
  backend:
    build:
      target: production
    restart: always
    environment:
      - NODE_ENV=production

  frontend:
    restart: always
    ports:
      - "80:80"
      - "443:443"

  postgres:
    restart: always
    volumes:
      - /mnt/pool/appdata/hr-app/pgdata:/var/lib/postgresql/data

  redis:
    restart: always
    volumes:
      - /mnt/pool/appdata/hr-app/redis-data:/data
```

Start with:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### Backup

```bash
# Database backup
docker compose exec postgres pg_dump -U postgres hr_monitoring > backup_$(date +%Y%m%d).sql

# Restore
cat backup_20260224.sql | docker compose exec -T postgres psql -U postgres hr_monitoring
```

## TypeScript Migration Guide

The codebase is written in JavaScript with JSDoc type annotations, designed for easy migration to TypeScript:

1. **Install TypeScript**: `npm install -D typescript @types/node @types/express`
2. **Create tsconfig.json** with `"allowJs": true` to enable incremental migration
3. **Rename files** `.js` → `.ts` one module at a time
4. **Add type annotations** — JSDoc comments map directly to TS types
5. **Models**: Convert Objection.js models to use typed `QueryBuilder` and `ModelObject`
6. **Validators**: Joi schemas can be extracted to TypeScript interfaces with `joi-to-typescript`

## License

Private — Internal Use Only
