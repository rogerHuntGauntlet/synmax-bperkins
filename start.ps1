# PowerShell script to start the application

# Function to check if a command exists
function Test-Command {
    param (
        [string]$Command
    )
    
    try {
        if (Get-Command $Command -ErrorAction Stop) {
            return $true
        }
    }
    catch {
        return $false
    }
}

# Start the Python server in a new window
Write-Host "Starting Python server..."
$pythonJob = Start-Job -ScriptBlock {
    Set-Location "$using:PWD\python"
    python server.py
}
Write-Host "Python server started with job ID $($pythonJob.Id)"

# Wait for the Python server to start
Start-Sleep -Seconds 3

# Check if ngrok is installed
if (Test-Command "ngrok") {
    Write-Host "Starting ngrok tunnel..."
    $ngrokJob = Start-Job -ScriptBlock {
        ngrok http 8000
    }
    Write-Host "Ngrok started with job ID $($ngrokJob.Id)"
    
    # Wait for ngrok to start
    Start-Sleep -Seconds 5
    
    # Try to get the ngrok URL (this is more complex in PowerShell - may not work consistently)
    try {
        $ngrokInfo = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -UseBasicParsing
        $ngrokUrl = $ngrokInfo.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -ExpandProperty public_url
        
        if ($ngrokUrl) {
            Write-Host "Ngrok URL: $ngrokUrl"
            Set-Content -Path ".env.local" -Value "PYTHON_API_URL=$ngrokUrl"
            Write-Host "Updated .env.local with Python API URL"
        } else {
            Write-Host "Failed to get ngrok URL. Please manually update .env.local"
        }
    } catch {
        Write-Host "Error accessing ngrok API. Please manually update .env.local"
    }
} else {
    Write-Host "Ngrok not found. Please install ngrok and run it manually."
    Write-Host "After starting ngrok, update your .env.local file with the URL."
}

# Start the Next.js app
Write-Host "Starting Next.js app..."
npm run dev

# Clean up jobs on exit
Write-Host "Stopping all processes..."
Stop-Job -Job $pythonJob
Remove-Job -Job $pythonJob
if ($ngrokJob) {
    Stop-Job -Job $ngrokJob
    Remove-Job -Job $ngrokJob
} 