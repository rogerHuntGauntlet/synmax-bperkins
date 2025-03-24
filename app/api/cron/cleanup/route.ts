import { NextRequest, NextResponse } from 'next/server';
import { JobData, getRedisClient, scanJobs } from '@/app/lib/db';

// This endpoint is called by Vercel Cron to clean up expired jobs
// Set up in vercel.json with schedule: "0 0 * * *" (daily at midnight)
export async function GET(request: NextRequest) {
  try {
    // Verify request is from Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (process.env.VERCEL && !authHeader) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Due to TTL in Redis, many keys will auto-expire
    // This job handles any additional cleanup like removing old files

    // Get current timestamp
    const now = Math.floor(Date.now() / 1000);
    
    // Get Redis client
    const redis = await getRedisClient();
    
    // Get all job keys that match pattern
    const jobKeys = await scanJobs('job:*');
    
    const keysToDelete: string[] = [];
    
    // Check each job and find expired ones
    for (const key of jobKeys) {
      try {
        const jobData = await redis.get(key);
        if (jobData) {
          const job = JSON.parse(jobData) as JobData;
          if (job && job.expiresAt && job.expiresAt < now - 60 * 60 * 24 * 30) { // 30 days past expiration
            keysToDelete.push(key);
          }
        }
      } catch (error) {
        console.error(`Error checking job ${key}:`, error);
      }
    }
    
    // Delete expired jobs
    if (keysToDelete.length > 0) {
      await Promise.all(keysToDelete.map(key => redis.del(key)));
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