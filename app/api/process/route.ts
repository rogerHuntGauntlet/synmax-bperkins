import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { PythonShell, Options } from 'python-shell';
import { uploadFile, uploadResultJson } from '@/app/lib/storage';
import { createJob, updateJob, JOB_STATUS } from '@/app/lib/db';
import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

// Process API route that handles file uploads and processing
export async function POST(request: NextRequest) {
  // Declare job ID at function scope to use throughout the function
  let jobId = randomUUID();
  
  try {
    // Check if this is a formData request or a JSON request
    const contentType = request.headers.get('content-type') || '';
    let fileUrl: string;
    let fileName: string;

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

      // Create initial job record
      await createJob(jobId);

      // Upload file to Vercel Blob
      const result = await uploadFile(file, file.name);
      fileUrl = result.url;
      fileName = result.fileName;

      // Update job with file information
      await updateJob(jobId, JOB_STATUS.PENDING, {
        metadata: {
          fileUrl,
          fileName
        }
      });
    } else {
      // Handle file path from previous API call
      const body = await request.json();
      
      if (!body.fileUrl) {
        return NextResponse.json(
          { error: 'No file URL provided' },
          { status: 400 }
        );
      }

      fileUrl = body.fileUrl;
      jobId = body.jobId || jobId;
      fileName = body.fileName || `file-${jobId}`;

      // Create initial job record with file information
      await createJob(jobId, {
        fileUrl,
        fileName
      });
    }

    // Update job status to PROCESSING
    await updateJob(jobId, JOB_STATUS.PROCESSING);

    // Start processing in background (using Edge Runtime background tasks)
    if (process.env.VERCEL_REGION) {
      // This is running on Vercel - use background processing
      void processFileInBackground(fileUrl, jobId, fileName);
      
      // Return immediately with job ID
      return NextResponse.json({
        success: true,
        jobId,
        status: JOB_STATUS.PROCESSING,
        message: 'Processing started'
      });
    } else {
      // Running locally - process synchronously
      // Create necessary directories if they don't exist
      const uploadDir = join(process.cwd(), 'uploads');
      const resultsDir = join(process.cwd(), 'results');
      
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
      
      if (!existsSync(resultsDir)) {
        await mkdir(resultsDir, { recursive: true });
      }

      // Download the file locally
      const response = await fetch(fileUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      const localFilePath = join(uploadDir, `${jobId}-${fileName}`);
      const resultPath = join(resultsDir, `${jobId}-result.json`);
      await writeFile(localFilePath, buffer);

      // Set up Python shell options
      const options: Options = {
        mode: 'text',
        pythonPath: 'python', // Use appropriate path or environment
        scriptPath: join(process.cwd(), 'python'),
        args: [localFilePath, resultPath]
      };

      // Run the Python script
      const pythonResponse = await new Promise<string[]>((resolve, reject) => {
        PythonShell.run('micro_motion_estimator.py', options)
          .then(results => resolve(results || []))
          .catch(err => reject(err));
      });

      // Update job status to COMPLETED
      await updateJob(jobId, JOB_STATUS.COMPLETED, {
        resultsUrl: `/api/results/${jobId}`,
      });

      // Return success response
      return NextResponse.json({
        success: true,
        jobId,
        status: JOB_STATUS.COMPLETED,
        message: pythonResponse.join('\n')
      });
    }
  } catch (error) {
    console.error('Error processing SAR image:', error);
    
    // Update job status to FAILED if we have a jobId
    if (jobId) {
      await updateJob(jobId, JOB_STATUS.FAILED, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to process the SAR image' },
      { status: 500 }
    );
  }
}

/**
 * Process a file in a background task on Vercel
 * Note: This function works with Vercel's background execution model
 */
async function processFileInBackground(fileUrl: string, jobId: string, fileName: string): Promise<void> {
  try {
    console.log(`Starting background processing of ${fileName} (${jobId})`);

    // Invoke the Python processing via edge function or webhook
    // For this example, we'll use a simulated processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update job status to COMPLETED (in a real implementation, this would be done after actual processing)
    await updateJob(jobId, JOB_STATUS.COMPLETED, {
      resultsUrl: `/api/results/${jobId}`,
      // In a real implementation, you would store results URL from your processing
    });
    
    console.log(`Background processing completed for ${jobId}`);
  } catch (error) {
    console.error(`Error in background processing for ${jobId}:`, error);
    
    await updateJob(jobId, JOB_STATUS.FAILED, {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 