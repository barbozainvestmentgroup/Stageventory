# Stageventory (StageFlow)

Professional management platform for real estate staging companies. Built with Next.js, Prisma, and PostgreSQL.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Docker](https://www.docker.com/) (recommended) **or** a local PostgreSQL 16 installation

## Quick Start (one command)

Make sure Docker is running, then:

```bash
npm run setup
```

This single command will:
1. Install all dependencies
2. Create your `.env` file with a generated secret
3. Start a PostgreSQL database via Docker
4. Create all database tables
5. Seed the database with demo data

Once setup finishes, start the app:

```bash
npm run dev
```

Open **http://localhost:3000** in your browser and log in with:

| Field    | Value                  |
|----------|------------------------|
| Email    | `admin@stageflow.com`  |
| Password | `password123`          |

That's it! You should see the StageFlow dashboard.

---

## Manual Setup (step by step)

If you prefer to set things up manually or don't have Docker:

### 1. Install dependencies

```bash
npm install
```

### 2. Start the database

**Option A — Docker (recommended):**

```bash
docker compose up -d
```

**Option B — Local PostgreSQL:**

```sql
CREATE USER stageflow WITH PASSWORD 'stageflow';
CREATE DATABASE stageflow OWNER stageflow;
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` if you changed any database credentials. Generate a `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

### 4. Set up the database

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Demo Accounts

> **⚠️ These credentials are for local development only. Change all passwords before deploying to any shared or production environment.**

| Role      | Email                    | Password      |
|-----------|--------------------------|---------------|
| Admin     | admin@stageflow.com      | password123   |
| Office    | sarah@stageflow.com      | password123   |
| Warehouse | mike@stageflow.com       | password123   |
| Crew      | alex@stageflow.com       | password123   |

## Available Scripts

| Command              | Description                           |
|----------------------|---------------------------------------|
| `npm run setup`      | **One-command full setup**            |
| `npm run dev`        | Start development server              |
| `npm run build`      | Build for production                  |
| `npm run start`      | Start production server               |
| `npm run lint`       | Run ESLint                            |
| `npm run db:generate`| Generate Prisma client                |
| `npm run db:push`    | Push schema to database               |
| `npm run db:migrate` | Run Prisma migrations                 |
| `npm run db:seed`    | Seed the database with demo data      |
| `npm run db:studio`  | Open Prisma Studio (database GUI)     |

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** PostgreSQL 16 with Prisma ORM
- **Auth:** NextAuth.js (credentials provider)
- **UI:** Radix UI + Tailwind CSS
- **Validation:** Zod
- **Language:** TypeScript
