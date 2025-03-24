# PowerShell script to deploy AWS infrastructure for Ship Micro-Motion Analysis System

# Set parameters
$STACK_NAME = "ship-micro-motion-stack"
$REGION = "us-east-1"
$TEMPLATE_FILE = Join-Path (Get-Location) "cloudformation.yaml"
$LAMBDA_TEMPLATE_FILE = Join-Path (Get-Location) "lambda-template.yaml"
$LAMBDA_LAYER_DIR = Join-Path (Get-Location) "lambda-layer"
$LAMBDA_FUNCTION_DIR = Join-Path (Get-Location) "lambda-function"
$UPLOAD_BUCKET = "ship-mm-uploads"

# Check if template files exist
if (-not (Test-Path $TEMPLATE_FILE)) {
    Write-Host "CloudFormation template file not found: $TEMPLATE_FILE" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $LAMBDA_TEMPLATE_FILE)) {
    Write-Host "Lambda template file not found: $LAMBDA_TEMPLATE_FILE" -ForegroundColor Red
    exit 1
}

# Create Lambda layer and function packages if they don't exist
if (-not (Test-Path $LAMBDA_LAYER_DIR)) {
    Write-Host "Creating Lambda layer..." -ForegroundColor Yellow
    & .\create-lambda-layer.ps1
}

if (-not (Test-Path $LAMBDA_FUNCTION_DIR)) {
    Write-Host "Packaging Lambda function..." -ForegroundColor Yellow
    & .\package-lambda.ps1
}

# Deploy main CloudFormation stack
Write-Host "Deploying main CloudFormation stack..." -ForegroundColor Green
aws cloudformation deploy `
    --template-file $TEMPLATE_FILE `
    --stack-name $STACK_NAME `
    --capabilities CAPABILITY_NAMED_IAM `
    --region $REGION

# Check if deployment was successful
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to deploy CloudFormation stack" -ForegroundColor Red
    exit 1
}

# Get outputs from the CloudFormation stack
Write-Host "Getting stack outputs..." -ForegroundColor Green
$outputs = aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION | ConvertFrom-Json
$lambdaRoleArn = ($outputs.Stacks[0].Outputs | Where-Object { $_.OutputKey -eq "LambdaExecutionRoleARN" }).OutputValue

# Upload Lambda layer and function to S3
Write-Host "Uploading Lambda layer to S3..." -ForegroundColor Green
$layerFile = Join-Path $LAMBDA_LAYER_DIR "python-dependencies.zip"
aws s3 cp $layerFile s3://$UPLOAD_BUCKET/lambda-layers/python-dependencies.zip --region $REGION

Write-Host "Uploading Lambda function to S3..." -ForegroundColor Green
$functionFile = Join-Path $LAMBDA_FUNCTION_DIR "sar-processing.zip"
aws s3 cp $functionFile s3://$UPLOAD_BUCKET/lambda/sar-processing.zip --region $REGION

# Deploy Lambda stack
Write-Host "Deploying Lambda stack..." -ForegroundColor Green
aws cloudformation deploy `
    --template-file $LAMBDA_TEMPLATE_FILE `
    --stack-name "$STACK_NAME-lambda" `
    --parameter-overrides "LambdaExecutionRoleArn=$lambdaRoleArn" `
    --capabilities CAPABILITY_IAM `
    --region $REGION

# Check if Lambda deployment was successful
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to deploy Lambda stack" -ForegroundColor Red
    exit 1
}

# Get deployment output
Write-Host "Getting Lambda function ARN..." -ForegroundColor Green
$lambdaOutputs = aws cloudformation describe-stacks --stack-name "$STACK_NAME-lambda" --region $REGION | ConvertFrom-Json
$lambdaFunctionArn = ($lambdaOutputs.Stacks[0].Outputs | Where-Object { $_.OutputKey -eq "SARProcessingFunctionArn" }).OutputValue

Write-Host "Deployment completed successfully!" -ForegroundColor Green
Write-Host "Lambda function ARN: $lambdaFunctionArn" -ForegroundColor Green

# Create a .env.local file with AWS configuration for the Next.js app
$envFile = Join-Path (Resolve-Path "..") ".env.local"
$envContent = @"
# AWS Configuration
NEXT_PUBLIC_AWS_REGION=$REGION
NEXT_PUBLIC_UPLOADS_BUCKET=$UPLOAD_BUCKET
NEXT_PUBLIC_RESULTS_BUCKET=ship-mm-results
NEXT_PUBLIC_API_ENDPOINT=
"@

Set-Content -Path $envFile -Value $envContent
Write-Host "Created .env.local file with AWS configuration" -ForegroundColor Green 