// This file contains utilities for database operations
// Using Vercel KV (Redis) for storage

import { kv } from '@vercel/kv';

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

/**
 * Create a new job in the database
 */
export async function createJob(jobId: string, metadata?: Record<string, any>): Promise<JobData> {
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

  // Store in KV with TTL
  await kv.set(`job:${jobId}`, jobData, { ex: 60 * 60 * 24 * 7 }); // 7 days expiry
  
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
  
  // Save to KV with same TTL
  const ttl = updatedJob.expiresAt 
    ? Math.max(0, updatedJob.expiresAt - Math.floor(Date.now() / 1000))
    : 60 * 60 * 24 * 7; // Default 7 days
    
  await kv.set(`job:${jobId}`, updatedJob, { ex: ttl });
  
  return updatedJob;
}

/**
 * Get job data
 */
export async function getJob(jobId: string): Promise<JobData | null> {
  const jobData = await kv.get<JobData>(`job:${jobId}`);
  return jobData;
}

/**
 * Delete a job
 */
export async function deleteJob(jobId: string): Promise<boolean> {
  const result = await kv.del(`job:${jobId}`);
  return result === 1;
} 