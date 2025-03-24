import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// Get the Python API URL from environment variables
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000';

// Handle GET requests for sample data
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return NextResponse.json(
        { error: 'No URL provided in query parameters' },
        { status: 400 }
      );
    }
    
    console.log(`Downloading sample data from: ${url}`);
    
    // Use fetch directly to download the file
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    // Get the file data
    const fileData = await response.arrayBuffer();
    const buffer = Buffer.from(fileData);
    
    // Create form data to send to Python API
    const formData = new FormData();
    const fileName = url.split('/').pop() || `sample-${randomUUID()}.dat`;
    const file = new File([buffer], fileName, { type: 'application/octet-stream' });
    formData.append('file', file);
    
    // Send to Python API for processing
    console.log(`Processing file at Python API: ${PYTHON_API_URL}/process`);
    const pythonResponse = await fetch(`${PYTHON_API_URL}/process`, {
      method: 'POST',
      body: formData,
    });
    
    if (!pythonResponse.ok) {
      const errorText = await pythonResponse.text();
      throw new Error(`Python API error: ${pythonResponse.status}, ${errorText}`);
    }
    
    // Return the processed results
    const results = await pythonResponse.json();
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error processing sample data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process sample data', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Handle POST requests for manual URLs
export async function POST(request: NextRequest) {
  try {
    // Get the URL to download
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'No URL provided' },
        { status: 400 }
      );
    }
    
    console.log(`Downloading file from: ${url}`);
    
    // Use fetch directly to download the file
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    // Get the file data
    const fileData = await response.arrayBuffer();
    const buffer = Buffer.from(fileData);
    
    // Create form data to send to Python API
    const formData = new FormData();
    const fileName = url.split('/').pop() || `file-${randomUUID()}.dat`;
    const file = new File([buffer], fileName, { type: 'application/octet-stream' });
    formData.append('file', file);
    
    // Send to Python API for processing
    console.log(`Processing file at Python API: ${PYTHON_API_URL}/process`);
    const pythonResponse = await fetch(`${PYTHON_API_URL}/process`, {
      method: 'POST',
      body: formData,
    });
    
    if (!pythonResponse.ok) {
      const errorText = await pythonResponse.text();
      throw new Error(`Python API error: ${pythonResponse.status}, ${errorText}`);
    }
    
    // Return the processed results
    const results = await pythonResponse.json();
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error downloading and processing file:', error);
    return NextResponse.json(
      { 
        error: 'Failed to download and process the file', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 