#!/bin/bash

# Exit on error
set -e

echo "Creating Lambda layer for Python dependencies..."

# Create a temporary directory for the layer
TEMP_DIR=$(mktemp -d)
echo "Using temporary directory: $TEMP_DIR"

# Create the Python directory structure required for Lambda layers
mkdir -p $TEMP_DIR/python

# Copy requirements.txt to temp directory
cp ../python/requirements.txt $TEMP_DIR/

# Install dependencies
echo "Installing Python dependencies..."
pip install -r $TEMP_DIR/requirements.txt -t $TEMP_DIR/python --no-cache-dir

# Remove unnecessary files to reduce the layer size
echo "Cleaning up unnecessary files..."
find $TEMP_DIR -type d -name "__pycache__" -exec rm -rf {} +
find $TEMP_DIR -type f -name "*.pyc" -delete
find $TEMP_DIR -type f -name "*.pyo" -delete
find $TEMP_DIR -type f -name "*.dist-info" | xargs rm -rf
find $TEMP_DIR -type d -name "tests" -exec rm -rf {} +
find $TEMP_DIR -type d -name "docs" -exec rm -rf {} +

# Create the zip file
echo "Creating zip file..."
OUTPUT_DIR="./lambda-layer"
mkdir -p $OUTPUT_DIR
OUTPUT_ZIP="$OUTPUT_DIR/python-dependencies.zip"
cd $TEMP_DIR && zip -r $OUTPUT_ZIP . -x "*.git*" -x "*.github*" -x "*__pycache__*" -x "*.pytest_cache*"
echo "Lambda layer created at: $OUTPUT_ZIP"

# Clean up
echo "Cleaning up temporary directory..."
rm -rf $TEMP_DIR

echo "Lambda layer creation completed!" 