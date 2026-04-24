#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# AI Medical Device Compliance Manager - Start Script
# ═══════════════════════════════════════════════════════════════════════════

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PORT=4000
FRONTEND_PORT=3000

echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║   AI Medical Device Compliance Manager - Starting...            ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# ─── Step 1: Clean up used ports ──────────────────────────────────────────
echo "🔧 Cleaning up ports $BACKEND_PORT and $FRONTEND_PORT..."

cleanup_port() {
  local port=$1
  local pids=$(lsof -ti:$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "   Killing processes on port $port: $pids"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  else
    echo "   Port $port is free"
  fi
}

cleanup_port $BACKEND_PORT
cleanup_port $FRONTEND_PORT
echo ""

# ─── Step 2: Check PostgreSQL ─────────────────────────────────────────────
echo "🐘 Checking PostgreSQL..."
if command -v pg_isready &> /dev/null; then
  if pg_isready -q 2>/dev/null; then
    echo "   PostgreSQL is running"
  else
    echo "   Starting PostgreSQL..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
      brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
    else
      sudo service postgresql start 2>/dev/null || true
    fi
    sleep 2
  fi
else
  echo "   pg_isready not found, assuming PostgreSQL is running"
fi
echo ""

# ─── Step 3: Create database if not exists ────────────────────────────────
echo "📦 Setting up database..."
DB_NAME="medical_compliance"
if psql -U postgres -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  echo "   Database '$DB_NAME' already exists"
else
  echo "   Creating database '$DB_NAME'..."
  createdb -U postgres "$DB_NAME" 2>/dev/null || psql -U postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "   Could not create DB - it may already exist or need manual creation"
fi
echo ""

# ─── Step 4: Install dependencies ─────────────────────────────────────────
echo "📥 Installing backend dependencies..."
cd "$PROJECT_DIR/server"
npm install --silent 2>&1 | tail -1
echo ""

echo "📥 Installing frontend dependencies..."
cd "$PROJECT_DIR/client"
npm install --silent 2>&1 | tail -1
echo ""

# ─── Step 5: Seed the database ────────────────────────────────────────────
echo "🌱 Seeding database with sample data..."
cd "$PROJECT_DIR/server"
node seed.js
echo ""

# ─── Step 6: Start backend with hot reload (nodemon) ─────────────────────
echo "🚀 Starting backend server on port $BACKEND_PORT (with hot reload)..."
cd "$PROJECT_DIR/server"
npx nodemon index.js &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
echo ""

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
for i in {1..30}; do
  if curl -s http://localhost:$BACKEND_PORT/api/health > /dev/null 2>&1; then
    echo "   Backend is ready!"
    break
  fi
  sleep 1
done
echo ""

# ─── Step 7: Start frontend with hot reload (Vite) ───────────────────────
echo "🚀 Starting frontend on port $FRONTEND_PORT (with hot reload)..."
cd "$PROJECT_DIR/client"
npx vite --port $FRONTEND_PORT &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"
echo ""

# ─── Done ─────────────────────────────────────────────────────────────────
sleep 3
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║   Application is running!                                       ║"
echo "║                                                                 ║"
echo "║   Frontend:  http://localhost:$FRONTEND_PORT                        ║"
echo "║   Backend:   http://localhost:$BACKEND_PORT                        ║"
echo "║                                                                 ║"
echo "║   Login:     admin@medcompliance.com / password123              ║"
echo "║                                                                 ║"
echo "║   Press Ctrl+C to stop all services                            ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"

# ─── Graceful shutdown ────────────────────────────────────────────────────
cleanup() {
  echo ""
  echo "🛑 Shutting down..."
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  cleanup_port $BACKEND_PORT
  cleanup_port $FRONTEND_PORT
  echo "   Goodbye!"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Keep script running
wait
