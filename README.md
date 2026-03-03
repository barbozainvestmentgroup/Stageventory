# Stageventory (StageFlow)

Professional management platform for real estate staging companies. Built with Next.js, Prisma, and PostgreSQL.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Docker](https://www.docker.com/) (recommended) **or** a local PostgreSQL 16 installation

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Start the database

**Option A — Docker (recommended):**

```bash
docker compose up -d
```

This starts a PostgreSQL 16 container with the default credentials already matching `.env.example`.

**Option B — Local PostgreSQL:**

Create a database and user, then update the `DATABASE_URL` in your `.env` file accordingly.

```sql
CREATE USER stageflow WITH PASSWORD 'stageflow';
CREATE DATABASE stageflow OWNER stageflow;
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` if you changed any database credentials. Generate a proper `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

### 4. Set up the database schema and seed data

```bash
npx prisma generate     # Generate the Prisma client
npx prisma db push      # Push schema to the database
npm run db:seed          # Seed with demo data
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
