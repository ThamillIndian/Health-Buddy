#!/bin/bash

# Chronic Health Buddy - Quick Start Script (macOS/Linux)

echo ""
echo "============================================"
echo "  Chronic Health Buddy - ONE DAY BUILD"
echo "============================================"
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 not found. Please install Python 3.8+"
    exit 1
fi

echo "[1/4] Setting up backend..."
cd backend

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtual environment..."
source venv/bin/activate

echo "Installing dependencies..."
pip install -r requirements.txt > /dev/null 2>&1

echo "Backend setup complete!"
echo ""

# Start backend
echo "[2/4] Starting backend server..."
echo "Starting FastAPI on http://localhost:8000"
echo "Press Ctrl+C to stop."
echo ""

python -m uvicorn app.main:app --reload &
BACKEND_PID=$!

sleep 3

# Go to frontend
cd ../frontend

echo "[3/4] Installing frontend dependencies..."
if [ ! -d "node_modules" ]; then
    npm install > /dev/null 2>&1
fi

echo "[4/4] Starting frontend server..."
echo "Frontend will start on http://localhost:3000"
echo "Press Ctrl+C to stop."
echo ""

npm run dev

# Cleanup
kill $BACKEND_PID 2>/dev/null
