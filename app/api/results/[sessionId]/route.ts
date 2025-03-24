import { NextRequest, NextResponse } from 'next/server';
import { getJob, JOB_STATUS } from '@/app/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId: jobId } = params;
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'No job ID provided' },
        { status: 400 }
      );
    }

    // Get job data from KV store
    const job = await getJob(jobId);
    
    if (!job) {
      return NextResponse.json(
        { error: 'Results not found for this job' },
        { status: 404 }
      );
    }

    // If job is still processing, return status
    if (job.status === JOB_STATUS.PROCESSING || job.status === JOB_STATUS.PENDING) {
      return NextResponse.json({
        success: true,
        jobId,
        status: job.status,
        message: 'Processing in progress'
      });
    }

    // If job failed, return error
    if (job.status === JOB_STATUS.FAILED) {
      return NextResponse.json({
        success: false,
        jobId,
        status: job.status,
        error: job.error || 'Processing failed'
      }, { status: 500 });
    }

    // Job completed successfully, return results
    return NextResponse.json({
      success: true,
      jobId,
      status: job.status,
      results: job.metadata?.results || {},
      visualizations: job.visualizations || {},
      updatedAt: job.updatedAt
    });
  } catch (error) {
    console.error('Error retrieving results:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve results' },
      { status: 500 }
    );
  }
} 