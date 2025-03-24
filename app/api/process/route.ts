import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { PythonShell, Options } from 'python-shell';
import { randomUUID } from 'crypto';
import * as fs from 'fs';

// TODO: Replace with your actual ngrok URL when running ngrok
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000';

// Process API route that handles file uploads and processing
export async function POST(request: NextRequest) {
  try {
    console.log('Received processing request');
    
    // Check if this is a formData request
    const contentType = request.headers.get('content-type') || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Only multipart/form-data requests are supported' },
        { status: 400 }
      );
    }
    
    // Get the multipart form data
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    console.log(`Forwarding request to Python API at ${PYTHON_API_URL}`);
    
    // Forward the request to your Python API
    const response = await fetch(`${PYTHON_API_URL}/process`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Python API error: ${response.status}, ${errorText}`);
      throw new Error(`Python API responded with status: ${response.status}, ${errorText}`);
    }
    
    // Return the results
    const results = await response.json();
    console.log('Received results from Python API');
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error processing SAR image:', error);
    return NextResponse.json(
      { error: 'Failed to process the SAR image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 