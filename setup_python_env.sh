#!/bin/bash

echo "Setting up Python environment for Ship Micro-Motion Estimation..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is not installed or not in PATH. Please install Python 3.7+ and try again."
    exit 1
fi

# Create a Python virtual environment
echo "Creating Python virtual environment..."
python3 -m venv python_env

# Activate the virtual environment
echo "Activating virtual environment..."
source python_env/bin/activate

# Install required packages
echo "Installing required Python packages..."
pip install -r python/requirements.txt

echo ""
echo "Python environment setup complete!"
echo ""
echo "To activate the environment, run: source python_env/bin/activate"
echo "To deactivate the environment, run: deactivate"
echo ""
echo "Now you can run the Next.js application with: npm run dev" 