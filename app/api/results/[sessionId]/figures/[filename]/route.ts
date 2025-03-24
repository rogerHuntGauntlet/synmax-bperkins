import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/app/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string; filename: string } }
) {
  try {
    const { sessionId: jobId, filename } = params;
    
    if (!jobId || !filename) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    // Get job data from KV store
    const job = await getJob(jobId);
    
    if (!job || !job.visualizations) {
      return NextResponse.json(
        { error: 'Visualizations not found for this job' },
        { status: 404 }
      );
    }

    // Find the correct visualization URL
    const visualizationUrls = job.visualizations;
    
    // Check if filename matches any visualization type (e.g., "displacement" or "frequency")
    let blobUrl = '';
    
    // Try to match by visualization type first
    for (const [type, url] of Object.entries(visualizationUrls)) {
      if (filename.includes(type)) {
        blobUrl = url;
        break;
      }
    }
    
    // If not found, just use the first one (fallback)
    if (!blobUrl && Object.values(visualizationUrls).length > 0) {
      blobUrl = Object.values(visualizationUrls)[0];
    }
    
    if (!blobUrl) {
      return NextResponse.json(
        { error: 'Visualization not found' },
        { status: 404 }
      );
    }

    // Redirect to the Blob URL
    return NextResponse.redirect(blobUrl);
  } catch (error) {
    console.error('Error serving figure:', error);
    return NextResponse.json(
      { error: 'Failed to serve figure' },
      { status: 500 }
    );
  }
} 