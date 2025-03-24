# PowerShell script to package the Lambda function code

# Create a temporary directory
$TEMP_DIR = Join-Path $env:TEMP "LambdaFunction_$(Get-Random)"
New-Item -ItemType Directory -Path $TEMP_DIR -Force | Out-Null
Write-Host "Using temporary directory: $TEMP_DIR"

# Copy the Python files
Write-Host "Copying Python files..."
$PYTHON_DIR = Join-Path (Resolve-Path "..") "python"
Get-ChildItem -Path $PYTHON_DIR -Filter "*.py" | Copy-Item -Destination $TEMP_DIR -Force

# Create the output directory
$OUTPUT_DIR = Join-Path (Get-Location) "lambda-function"
New-Item -ItemType Directory -Path $OUTPUT_DIR -Force | Out-Null

# Create the zip file
Write-Host "Creating zip file..."
$OUTPUT_ZIP = Join-Path $OUTPUT_DIR "sar-processing.zip"
$currentLocation = Get-Location
Set-Location $TEMP_DIR
Compress-Archive -Path "$TEMP_DIR\*" -DestinationPath $OUTPUT_ZIP -Force
Set-Location $currentLocation
Write-Host "Lambda function code packaged at: $OUTPUT_ZIP"

# Clean up
Write-Host "Cleaning up temporary directory..."
Remove-Item -Path $TEMP_DIR -Recurse -Force

Write-Host "Lambda function packaging completed!" 