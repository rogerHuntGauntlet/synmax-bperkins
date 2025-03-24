# PowerShell script to create a Lambda layer for Python dependencies

# Create a temporary directory for the layer
$TEMP_DIR = Join-Path $env:TEMP "LambdaLayer_$(Get-Random)"
New-Item -ItemType Directory -Path $TEMP_DIR -Force | Out-Null
Write-Host "Using temporary directory: $TEMP_DIR"

# Create the Python directory structure required for Lambda layers
$PYTHON_DIR = Join-Path $TEMP_DIR "python"
New-Item -ItemType Directory -Path $PYTHON_DIR -Force | Out-Null

# Copy requirements.txt to temp directory
$SRC_REQ = Join-Path (Resolve-Path "..") "python\requirements.txt"
$DEST_REQ = Join-Path $TEMP_DIR "requirements.txt"
Copy-Item -Path $SRC_REQ -Destination $DEST_REQ -Force

# Install dependencies
Write-Host "Installing Python dependencies..."
pip install -r $DEST_REQ -t $PYTHON_DIR --no-cache-dir

# Clean up unnecessary files to reduce the layer size
Write-Host "Cleaning up unnecessary files..."
Get-ChildItem -Path $PYTHON_DIR -Recurse -Directory | Where-Object { $_.Name -eq "__pycache__" } | Remove-Item -Recurse -Force
Get-ChildItem -Path $PYTHON_DIR -Recurse -File | Where-Object { $_.Extension -eq ".pyc" -or $_.Extension -eq ".pyo" } | Remove-Item -Force
Get-ChildItem -Path $PYTHON_DIR -Recurse -Directory | Where-Object { $_.Name -eq "tests" -or $_.Name -eq "docs" } | Remove-Item -Recurse -Force
Get-ChildItem -Path $PYTHON_DIR -Recurse -Directory | Where-Object { $_.Name -like "*.dist-info" } | Remove-Item -Recurse -Force

# Create the output directory
$OUTPUT_DIR = Join-Path (Get-Location) "lambda-layer"
New-Item -ItemType Directory -Path $OUTPUT_DIR -Force | Out-Null

# Create the zip file
Write-Host "Creating zip file..."
$OUTPUT_ZIP = Join-Path $OUTPUT_DIR "python-dependencies.zip"
$currentLocation = Get-Location
Set-Location $TEMP_DIR
Compress-Archive -Path "$TEMP_DIR\*" -DestinationPath $OUTPUT_ZIP -Force
Set-Location $currentLocation
Write-Host "Lambda layer created at: $OUTPUT_ZIP"

# Clean up
Write-Host "Cleaning up temporary directory..."
Remove-Item -Path $TEMP_DIR -Recurse -Force

Write-Host "Lambda layer creation completed!" 