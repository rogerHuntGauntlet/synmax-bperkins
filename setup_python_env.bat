@echo off
echo Setting up Python environment for Ship Micro-Motion Estimation...

:: Check if Python is installed
python --version > nul 2>&1
if %errorlevel% neq 0 (
    echo Python is not installed or not in PATH. Please install Python 3.7+ and try again.
    exit /b 1
)

:: Create a Python virtual environment
echo Creating Python virtual environment...
python -m venv python_env

:: Activate the virtual environment
echo Activating virtual environment...
call python_env\Scripts\activate.bat

:: Install required packages
echo Installing required Python packages...
pip install -r python\requirements.txt

echo.
echo Python environment setup complete!
echo.
echo To activate the environment, run: python_env\Scripts\activate.bat
echo To deactivate the environment, run: deactivate
echo.
echo Now you can run the Next.js application with: npm run dev 