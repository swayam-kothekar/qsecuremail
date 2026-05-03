#!/bin/bash

# QSecureMail Startup Script
# Starts the backend (Node.js/Express) and frontend (React/Vite) dev servers.
# Usage: chmod +x start.sh && ./start.sh

echo "🔐 Starting QSecureMail..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Start backend in background
echo "📡 Starting backend server..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi
npm run dev &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"
cd ..

# Wait a bit for backend to start
sleep 3

# Start frontend in background
echo "🎨 Starting frontend server..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi
npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"
cd ..

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  🚀 QSecureMail is running!"
echo "═══════════════════════════════════════════════════════════"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:5000"
echo ""
echo "  Press Ctrl+C to stop both servers"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Ctrl+C kills the entire process group (including nodemon's child processes)
trap "echo ''; echo '🛑 Stopping servers...'; kill 0; exit" INT

# Keep script running
wait
