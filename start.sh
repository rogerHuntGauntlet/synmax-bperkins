#!/bin/bash

# Start the Python server in a new terminal
echo "Starting Python server..."
cd python
python server.py &
PYTHON_PID=$!
echo "Python server started with PID $PYTHON_PID"

# Wait for the Python server to start
sleep 3

# Check if ngrok is installed
if command -v ngrok &> /dev/null; then
    echo "Starting ngrok tunnel..."
    ngrok http 8000 &
    NGROK_PID=$!
    echo "Ngrok started with PID $NGROK_PID"
    
    # Wait for ngrok to start
    sleep 5
    
    # Get the ngrok URL
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*' | grep -o 'http[^"]*')
    
    if [ -n "$NGROK_URL" ]; then
        echo "Ngrok URL: $NGROK_URL"
        echo "PYTHON_API_URL=$NGROK_URL" > .env.local
        echo "Updated .env.local with Python API URL"
    else
        echo "Failed to get ngrok URL. Please manually update .env.local"
    fi
else
    echo "Ngrok not found. Please install ngrok and run it manually."
    echo "After starting ngrok, update your .env.local file with the URL."
fi

# Start the Next.js app
echo "Starting Next.js app..."
npm run dev

# Trap Ctrl+C to kill background processes
trap 'echo "Stopping all processes..."; kill $PYTHON_PID; kill $NGROK_PID; exit' INT

# Wait for Next.js to exit
wait 