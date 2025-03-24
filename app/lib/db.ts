// This file contains utilities for database operations
// Using Redis for storage

import { createClient } from 'redis';

// Job status constants
export const JOB_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
};

// Job data type
export interface JobData {
  jobId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: number; // TTL in seconds
  error?: string;
  resultsUrl?: string;
  visualizations?: Record<string, string>;
  metadata?: Record<string, any>;
}

// Redis client initialization
let redisClient: ReturnType<typeof createClient> | null = null;

// Initialize Redis client
export async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
      },
    });
    
    redisClient.on('error', (err) => {
      console.error('Redis Client Error', err);
    });
    
    await redisClient.connect();
  }
  
  return redisClient;
}

/**
 * Create a new job in the database
 */
export async function createJob(jobId: string, metadata?: Record<string, any>): Promise<JobData> {
  const redis = await getRedisClient();
  const now = new Date().toISOString();
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 days from now

  const jobData: JobData = {
    jobId,
    status: JOB_STATUS.PENDING,
    createdAt: now,
    updatedAt: now,
    expiresAt,
    metadata,
  };

  // Store in Redis with TTL
  const key = `job:${jobId}`;
  await redis.set(key, JSON.stringify(jobData));
  await redis.expire(key, 60 * 60 * 24 * 7); // 7 days expiry
  
  return jobData;
}

/**
 * Update job status and data
 */
export async function updateJob(
  jobId: string, 
  status: string, 
  data?: Partial<JobData>
): Promise<JobData | null> {
  const redis = await getRedisClient();
  
  // Get existing job
  const job = await getJob(jobId);
  
  if (!job) {
    return null;
  }
  
  // Update job
  const updatedJob: JobData = {
    ...job,
    status,
    updatedAt: new Date().toISOString(),
    ...data,
  };
  
  // Save to Redis with same TTL
  const key = `job:${jobId}`;
  await redis.set(key, JSON.stringify(updatedJob));
  
  // Set expiration if available
  const ttl = updatedJob.expiresAt 
    ? Math.max(0, updatedJob.expiresAt - Math.floor(Date.now() / 1000))
    : 60 * 60 * 24 * 7; // Default 7 days
    
  await redis.expire(key, ttl);
  
  return updatedJob;
}

/**
 * Get job data
 */
export async function getJob(jobId: string): Promise<JobData | null> {
  const redis = await getRedisClient();
  const key = `job:${jobId}`;
  const data = await redis.get(key);
  
  if (!data) {
    return null;
  }
  
  try {
    return JSON.parse(data) as JobData;
  } catch (error) {
    console.error(`Error parsing job data for ${jobId}:`, error);
    return null;
  }
}

/**
 * Delete a job
 */
export async function deleteJob(jobId: string): Promise<boolean> {
  const redis = await getRedisClient();
  const key = `job:${jobId}`;
  const result = await redis.del(key);
  return result === 1;
}

/**
 * Scan for jobs matching pattern
 */
export async function scanJobs(pattern: string, count = 100): Promise<string[]> {
  const redis = await getRedisClient();
  
  const keys = [];
  let cursor = 0;
  
  do {
    // @ts-expect-error - Redis types expect different return format
    const result = await redis.scan(cursor, { MATCH: pattern, COUNT: count });
    cursor = result.cursor;
    
    if (result.keys.length > 0) {
      keys.push(...result.keys);
    }
  } while (cursor !== 0);
  
  return keys;
} 