import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { JobData } from '@/app/lib/db';

// This endpoint is called by Vercel Cron to clean up expired jobs
// Set up in vercel.json with schedule: "0 0 * * *" (daily at midnight)
export async function GET(request: NextRequest) {
  try {
    // Verify request is from Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (process.env.VERCEL && !authHeader) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Due to TTL in KV, many keys will auto-expire
    // This job handles any additional cleanup like removing old files

    // Get current timestamp
    const now = Math.floor(Date.now() / 1000);
    
    // Get all job keys that are at least 30 days old
    // Note: This might need pagination for large datasets
    const cursor = 0; // Using number as expected by the type definitions
    const scanResult = await kv.scan(cursor, {
      match: 'job:*',
      count: 100
    });
    
    const keysToDelete: string[] = [];
    
    // Scan results and find expired jobs
    if (scanResult && Array.isArray(scanResult.keys)) {
      for (const key of scanResult.keys) {
        try {
          const job = await kv.get<JobData>(key);
          if (job && job.expiresAt) {
            // Check if job is expired and hasn't been auto-cleaned
            if (job.expiresAt < now - 60 * 60 * 24 * 30) { // 30 days past expiration
              keysToDelete.push(key);
            }
          }
        } catch (error) {
          console.error(`Error checking job ${key}:`, error);
        }
      }
    }
    
    // Delete expired jobs
    if (keysToDelete.length > 0) {
      await Promise.all(keysToDelete.map(key => kv.del(key)));
      console.log(`Deleted ${keysToDelete.length} expired jobs`);
    }
    
    return NextResponse.json({ 
      success: true, 
      deleted: keysToDelete.length 
    });
  } catch (error) {
    console.error('Error in cleanup job:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 