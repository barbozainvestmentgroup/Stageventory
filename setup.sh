#!/usr/bin/env bash
set -e

echo ""
echo "========================================="
echo "  StageFlow — Automated Setup"
echo "========================================="
echo ""

# ── 1. Install npm dependencies ──────────────────────────────────────────────
echo "📦  Installing dependencies..."
npm install --silent
echo "   ✅  Dependencies installed"

# ── 2. Create .env from example (if it doesn't exist) ────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  # Generate a random NEXTAUTH_SECRET
  SECRET=$(openssl rand -base64 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" 2>/dev/null || "")
  if [ -z "$SECRET" ]; then
    echo "   ⚠️   Could not generate NEXTAUTH_SECRET automatically."
    echo "       Run: openssl rand -base64 32"
    echo "       Then paste the result into .env as NEXTAUTH_SECRET"
  else
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s|your-secret-key-here-generate-with-openssl-rand-base64-32|${SECRET}|" .env
    else
      sed -i "s|your-secret-key-here-generate-with-openssl-rand-base64-32|${SECRET}|" .env
    fi
  fi
  echo "   ✅  .env created with a generated secret"
else
  echo "   ⏭️   .env already exists — skipping"
fi

# ── 3. Start PostgreSQL via Docker Compose ───────────────────────────────────
if command -v docker &>/dev/null; then
  if docker compose ps --services --filter "status=running" 2>/dev/null | grep -q db; then
    echo "   ⏭️   PostgreSQL container already running"
  else
    echo "🐘  Starting PostgreSQL with Docker..."
    docker compose up -d
    echo "   ⏳  Waiting for PostgreSQL to be ready..."
    for i in $(seq 1 30); do
      if docker compose exec -T db pg_isready -U stageflow &>/dev/null; then
        break
      fi
      sleep 1
    done
    echo "   ✅  PostgreSQL is running"
  fi
else
  echo ""
  echo "⚠️   Docker not found!"
  echo "   You need a running PostgreSQL database."
  echo "   Either install Docker (https://docker.com) and re-run this script,"
  echo "   or set up PostgreSQL manually and update DATABASE_URL in .env"
  echo ""
fi

# ── 4. Generate Prisma client ────────────────────────────────────────────────
echo "🔧  Generating Prisma client..."
npx prisma generate
echo "   ✅  Prisma client generated"

# ── 5. Push schema to the database ──────────────────────────────────────────
echo "🗄️   Pushing database schema..."
npx prisma db push
echo "   ✅  Database schema is up to date"

# ── 6. Seed the database ────────────────────────────────────────────────────
echo "🌱  Seeding the database with demo data..."
npm run db:seed
echo "   ✅  Database seeded"

# ── Done! ────────────────────────────────────────────────────────────────────
echo ""
echo "========================================="
echo "  ✅  Setup complete!"
echo "========================================="
echo ""
echo "  Start the app:   npm run dev"
echo "  Then open:        http://localhost:3000"
echo ""
echo "  Login with:"
echo "    Email:     admin@stageflow.com"
echo "    Password:  password123"
echo ""
