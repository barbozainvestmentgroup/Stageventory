# Stageventory (StageFlow)

Professional management platform for real estate staging companies. Built with Next.js, Prisma, and PostgreSQL.

> **🟢 Want to see the app right now?** No downloads, no setup — just a browser and a free GitHub account.
>
> 1. **Sign in to GitHub** — if you don't have an account, [create one for free here](https://github.com/signup) (takes 1 minute).
> 2. **Click the button below** to launch the app:
>
>    [![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/barbozainvestmentgroup/Stageventory?quickstart=1)
>
> 3. **Wait ~3 minutes** while it builds. A browser-based editor will appear; watch the terminal at the bottom for progress.
> 4. When a popup says **"Open in Browser"**, click it. (Or go to the **Ports** tab and click 🌐 next to port 3000.)
> 5. **Log in** with Email: `admin@stageflow.com` / Password: `password123`
>
> That's it — you're in! See the [detailed guide](#option-1--open-in-github-codespaces-easiest-no-install-needed) below if you need more help.

### App Preview

| Login Page | Dashboard |
|:---:|:---:|
| ![Login page](https://github.com/user-attachments/assets/5d3fa87e-c74e-4275-b9e9-819b0265c334) | ![Dashboard](https://github.com/user-attachments/assets/3b3a14e8-6cc3-4be6-8b33-40ae6b2969a6) |

| Inventory | Projects |
|:---:|:---:|
| ![Inventory management](https://github.com/user-attachments/assets/45a73168-e80d-4d22-b7b4-6020bda965ec) | ![Project pipeline](https://github.com/user-attachments/assets/7cc456bf-2e7b-429d-ade2-9d23d9d2fab3) |

---

## View the App

### Option 1 — Open in GitHub Codespaces (easiest, no install needed)

Launch the full app in your browser with zero installs. All you need is a free GitHub account.

**Step-by-step:**

1. **Click the button below** (or the green **"<> Code"** button at the top of this repo → **Codespaces** tab → **"Create codespace on main"**):

   [![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/barbozainvestmentgroup/Stageventory?quickstart=1)

2. **Wait for the container to build** — a VS Code editor opens in your browser. In the bottom terminal you'll see progress messages as it installs dependencies, starts the database, and seeds demo data. This takes **2–4 minutes** the first time.

3. **The dev server starts automatically** — once setup finishes, the app starts on port 3000. GitHub will show a toast notification saying **"Your application running on port 3000 is available"**. Click **"Open in Browser"** (or check the **Ports** tab at the bottom and click the globe icon 🌐 next to port 3000).

4. **Log in** — you'll see the StageFlow login page. Enter the demo credentials:

   | Field    | Value                  |
   |----------|------------------------|
   | Email    | `admin@stageflow.com`  |
   | Password | `password123`          |

5. **You're in!** — You should now see the StageFlow dashboard with sample data already loaded.

> **💡 Tips:**
> - Free GitHub accounts include **60 hours/month** of Codespaces usage — more than enough for exploring.
> - Your codespace saves its state. You can close the browser and reopen it later from [github.com/codespaces](https://github.com/codespaces).
> - To stop the codespace and avoid using hours, go to [github.com/codespaces](https://github.com/codespaces) and click **"…" → Stop codespace**.

### Option 2 — Deploy to Vercel (free, live URL)

1. Fork this repo
2. Go to [vercel.com/new](https://vercel.com/new) and import your fork
3. Add a PostgreSQL database (Vercel Postgres, Neon, Supabase, or any provider)
4. Set these environment variables in Vercel:
   - `DATABASE_URL` — your PostgreSQL connection string
   - `NEXTAUTH_URL` — your Vercel deployment URL (e.g. `https://stageflow.vercel.app`)
   - `NEXTAUTH_SECRET` — run `openssl rand -base64 32` to generate one
5. Deploy — Vercel will build the Next.js app automatically
6. Run these commands locally with your production `DATABASE_URL` set, to create tables and seed data:
   ```bash
   DATABASE_URL="your-production-connection-string" npx prisma db push
   DATABASE_URL="your-production-connection-string" npm run db:seed
   ```

### Option 3 — Run locally

See the [Quick Start](#quick-start-one-command) section below.

---

## Prerequisites (local development)

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
