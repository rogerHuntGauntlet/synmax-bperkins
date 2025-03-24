import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { downloadAndUpload } from '@/app/lib/storage';
import { createJob, JOB_STATUS } from '@/app/lib/db';

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

    // Generate a job ID
    const jobId = randomUUID();

    // Create job record in database
    await createJob(jobId, { sourceUrl: url });

    // Download the file and upload to Vercel Blob
    const { url: fileUrl, fileName } = await downloadAndUpload(url);

    // Update job metadata with file information
    await createJob(jobId, {
      sourceUrl: url,
      fileUrl: fileUrl,
      fileName: fileName
    });

    // Return the file information
    return NextResponse.json({
      success: true,
      jobId,
      fileName,
      fileUrl
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json(
      { error: 'Failed to download the file' },
      { status: 500 }
    );
  }
} 