import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { PythonShell, Options } from 'python-shell';
import { randomUUID } from 'crypto';
import * as fs from 'fs';

// Process API route that handles file uploads and processing
export async function POST(request: NextRequest) {
  try {
    // Check if this is a formData request
    const contentType = request.headers.get('content-type') || '';
    let localFilePath: string;
    let fileName: string;
    
    // Create necessary directories if they don't exist (for local development)
    const uploadDir = join(process.cwd(), 'uploads');
    const resultsDir = join(process.cwd(), 'results');
    
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    
    if (!existsSync(resultsDir)) {
      await mkdir(resultsDir, { recursive: true });
    }

    // Process file upload
    if (contentType.includes('multipart/form-data')) {
      // Handle file upload from client
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      // Save file locally with unique name
      const uniqueId = randomUUID();
      fileName = file.name;
      localFilePath = join(uploadDir, `${uniqueId}-${fileName}`);
      const resultPath = join(resultsDir, `${uniqueId}-result.json`);
      
      // Read file as buffer and save it
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(localFilePath, buffer);
      
      // Set up Python shell options
      const options: Options = {
        mode: 'text',
        pythonPath: 'python', // Use appropriate path
        scriptPath: join(process.cwd(), 'python'),
        args: [localFilePath, resultPath]
      };

      // Run the Python script
      console.log(`Processing file: ${localFilePath}`);
      const pythonOutput = await new Promise<string[]>((resolve, reject) => {
        PythonShell.run('micro_motion_estimator.py', options)
          .then(results => resolve(results || []))
          .catch(err => reject(err));
      });
      
      // Read results file
      const resultData = await readFile(resultPath, 'utf-8');
      const results = JSON.parse(resultData);
      
      // Find any figure files
      const figureDir = `${uniqueId}-result_figures`;
      const figureDirPath = join(resultsDir, figureDir);
      let figures: string[] = [];
      
      if (existsSync(figureDirPath)) {
        const fileList = fs.readdirSync(figureDirPath);
        figures = fileList.map((file: string) => `/api/results/${uniqueId}/figures/${file}`);
      }
      
      // Return both the processing output and results
      return NextResponse.json({
        success: true,
        message: pythonOutput.join('\n'),
        results,
        figures,
        id: uniqueId
      });
    } else {
      return NextResponse.json(
        { error: 'Only multipart/form-data requests are supported' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error processing SAR image:', error);
    return NextResponse.json(
      { error: 'Failed to process the SAR image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 