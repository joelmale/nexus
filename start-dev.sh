#!/bin/bash

echo "🚀 Nexus VTT - Development Setup"
echo "================================"
echo ""

# Function to check if port is in use
check_port() {
    local port=$1
    lsof -i :$port >/dev/null 2>&1
    return $?
}

# Find available ports
echo "🔍 Finding available ports..."

# Check frontend ports
frontend_port=5173
for port in 5173 3000 4000 8080; do
    if ! check_port $port; then
        frontend_port=$port
        break
    fi
done

# Check backend ports  
backend_port=5000
for port in 5000 5001 5002 8081; do
    if ! check_port $port; then
        backend_port=$port
        break
    fi
done

echo "✅ Frontend: Port $frontend_port"
echo "✅ Backend:  Port $backend_port"
echo ""

echo "🎯 Development Commands:"
echo "========================"
echo ""
echo "🖥️  Terminal 1 (Frontend):"
if [ $frontend_port -eq 5173 ]; then
    echo "   npm run dev"
else
    echo "   PORT=$frontend_port npm run dev"
fi
echo "   📱 Opens: http://localhost:$frontend_port"
echo ""

echo "⚙️  Terminal 2 (Backend):"
if [ $backend_port -eq 5000 ]; then
    echo "   npm run server:dev"
else
    echo "   PORT=$backend_port npm run server:dev"
fi
echo "   🔌 WebSocket: ws://localhost:$backend_port/ws"
echo ""

# If ports don't match defaults, show environment variable setup
if [ $frontend_port -ne 5173 ] || [ $backend_port -ne 5000 ]; then
    echo "⚠️  Non-default ports detected!"
    echo ""
    echo "🔧 Option 1: Use environment variables"
    echo "   Terminal 1: PORT=$frontend_port WS_PORT=$backend_port npm run dev"
    echo "   Terminal 2: PORT=$backend_port npm run server:dev"
    echo ""
    echo "🔧 Option 2: Use our helper scripts"
    echo "   Terminal 1: npm run dev:$frontend_port"
    echo "   Terminal 2: npm run server:dev:$backend_port"
fi

echo ""
echo "💡 Quick Tips:"
echo "─────────────"
echo "• Both servers must be running for the app to work"
echo "• The frontend connects to the backend via WebSocket"
echo "• Changes to frontend code hot-reload automatically"
echo "• Changes to backend code restart the server automatically"
echo ""

# Offer to start servers
read -p "🚀 Start both servers now? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Starting servers..."
    
    # Install concurrently if not available
    if ! npm list concurrently >/dev/null 2>&1; then
        echo "📦 Installing concurrently..."
        npm install --save-dev concurrently
    fi
    
    # Start both servers
    if [ $frontend_port -eq 5173 ] && [ $backend_port -eq 5000 ]; then
        npx concurrently \
            "npm run server:dev" \
            "npm run dev" \
            --names "backend,frontend" \
            --prefix-colors "blue,green"
    else
        npx concurrently \
            "PORT=$backend_port npm run server:dev" \
            "PORT=$frontend_port WS_PORT=$backend_port npm run dev" \
            --names "backend,frontend" \
            --prefix-colors "blue,green"
    fi
else
    echo "👍 Run the commands above in separate terminals when ready!"
fi
