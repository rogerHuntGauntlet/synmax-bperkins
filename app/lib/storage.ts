// This file contains utilities for file storage operations
// Using Vercel Blob Storage

import { put, del, list } from '@vercel/blob';
import { randomUUID } from 'crypto';

/**
 * Upload a file to Blob Storage
 */
export async function uploadFile(
  file: File | Buffer | ArrayBuffer,
  fileName?: string,
  folder = 'uploads'
): Promise<{ url: string; fileName: string }> {
  // Generate a unique file name if not provided
  const uniqueFileName = fileName || `${randomUUID()}-${Date.now()}`;
  const pathname = `${folder}/${uniqueFileName}`;

  let blob;
  if (file instanceof File) {
    // Handle File object
    blob = await put(pathname, file, {
      access: 'public',
    });
  } else {
    // Handle Buffer or ArrayBuffer
    const buffer = file instanceof ArrayBuffer ? Buffer.from(file) : file;
    blob = await put(pathname, buffer, {
      access: 'public',
    });
  }

  return {
    url: blob.url,
    fileName: uniqueFileName,
  };
}

/**
 * Upload a result JSON file
 */
export async function uploadResultJson(
  data: any,
  jobId: string
): Promise<string> {
  const jsonString = JSON.stringify(data);
  const buffer = Buffer.from(jsonString);
  
  const { url } = await uploadFile(
    buffer,
    `${jobId}-results.json`,
    'results'
  );
  
  return url;
}

/**
 * Upload a visualization image
 */
export async function uploadVisualization(
  imageBuffer: Buffer,
  jobId: string,
  type: string
): Promise<string> {
  const { url } = await uploadFile(
    imageBuffer,
    `${jobId}-${type}.png`,
    'visualizations'
  );
  
  return url;
}

/**
 * Delete a file from Blob Storage
 */
export async function deleteFile(url: string): Promise<void> {
  await del(url);
}

/**
 * Download a file from a URL and upload to Blob Storage
 */
export async function downloadAndUpload(
  url: string,
  folder = 'uploads'
): Promise<{ url: string; fileName: string }> {
  // Extract filename from URL
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;
  const fileName = pathname.split('/').pop() || `sample-data-${randomUUID()}`;

  // Fetch the file
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }

  // Get the file buffer
  const buffer = Buffer.from(await response.arrayBuffer());
  
  // Upload to Blob Storage
  return uploadFile(buffer, fileName, folder);
} 