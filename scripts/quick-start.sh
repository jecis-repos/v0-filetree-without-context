#!/bin/bash

# Quick start script for immediate development
echo "⚡ Quick Start - Enterprise File Explorer"
echo "========================================"
echo ""

# Check if this is first time setup
if [ ! -f ".env.local" ] || [ ! -d "node_modules" ]; then
    echo "🔧 First time setup detected. Running full setup..."
    ./scripts/setup.sh
else
    echo "✅ Environment already configured"
fi

echo ""
echo "🚀 Starting development server..."
echo "📱 Mobile-first responsive design enabled"
echo "🎨 Dark theme fully integrated"
echo "🔧 Development tools configured"
echo ""

# Start the development server
npm run dev &
DEV_PID=$!

echo "🌐 Application starting at: http://localhost:3000"
echo "📊 Health dashboard: http://localhost:3000/health"
echo "🔍 Deployment check: http://localhost:3000/deployment-check"
echo "✅ API verification: http://localhost:3000/verification"
echo ""
echo "Press Ctrl+C to stop the development server"
echo ""

# Wait for the development server
wait $DEV_PID
