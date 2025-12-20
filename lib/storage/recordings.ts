/**
 * Cloudflare R2 Storage Service
 * 
 * Handles video recording storage using Cloudflare R2 (S3-compatible)
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize R2 client (S3-compatible)
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL || `https://${BUCKET_NAME}.r2.dev`;

export interface UploadResult {
  url: string;
  key: string;
  size: number;
}

/**
 * Upload a recording file to R2
 */
export async function uploadRecording(
  file: Buffer | Uint8Array,
  sessionId: string,
  fileName: string = 'recording.mp4'
): Promise<UploadResult> {
  try {
    const key = `sessions/${sessionId}/${fileName}`;
    
    console.log(`📤 Uploading recording to R2: ${key}`);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: 'video/mp4',
      Metadata: {
        sessionId,
        uploadedAt: new Date().toISOString(),
      },
    });

    await r2Client.send(command);

    const url = `${PUBLIC_URL}/${key}`;
    
    console.log(`✅ Recording uploaded successfully: ${url}`);

    return {
      url,
      key,
      size: file.byteLength,
    };
  } catch (error) {
    console.error('❌ Error uploading recording:', error);
    throw new Error(`Failed to upload recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get a signed URL for accessing a private recording
 */
export async function getRecordingUrl(
  sessionId: string,
  fileName: string = 'recording.mp4',
  expiresIn: number = 3600 // 1 hour
): Promise<string> {
  try {
    const key = `sessions/${sessionId}/${fileName}`;

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    // Generate signed URL
    const url = await getSignedUrl(r2Client, command, { expiresIn });

    return url;
  } catch (error) {
    console.error('❌ Error getting recording URL:', error);
    throw new Error(`Failed to get recording URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get public URL for a recording (if bucket is public)
 */
export function getPublicRecordingUrl(sessionId: string, fileName: string = 'recording.mp4'): string {
  const key = `sessions/${sessionId}/${fileName}`;
  return `${PUBLIC_URL}/${key}`;
}

/**
 * Delete a recording from R2
 */
export async function deleteRecording(
  sessionId: string,
  fileName: string = 'recording.mp4'
): Promise<void> {
  try {
    const key = `sessions/${sessionId}/${fileName}`;

    console.log(`🗑️ Deleting recording from R2: ${key}`);

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);

    console.log(`✅ Recording deleted successfully`);
  } catch (error) {
    console.error('❌ Error deleting recording:', error);
    throw new Error(`Failed to delete recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if a recording exists
 */
export async function recordingExists(
  sessionId: string,
  fileName: string = 'recording.mp4'
): Promise<boolean> {
  try {
    const key = `sessions/${sessionId}/${fileName}`;

    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get recording metadata
 */
export async function getRecordingMetadata(
  sessionId: string,
  fileName: string = 'recording.mp4'
): Promise<{
  size: number;
  lastModified?: Date;
  contentType?: string;
  metadata?: Record<string, string>;
}> {
  try {
    const key = `sessions/${sessionId}/${fileName}`;

    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await r2Client.send(command);

    return {
      size: response.ContentLength || 0,
      lastModified: response.LastModified,
      contentType: response.ContentType,
      metadata: response.Metadata,
    };
  } catch (error) {
    console.error('❌ Error getting recording metadata:', error);
    throw new Error(`Failed to get recording metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate thumbnail from video (requires FFmpeg or external service)
 * For now, returns a placeholder
 */
export async function generateThumbnail(_videoUrl: string): Promise<string> {
  // TODO: Implement thumbnail generation
  // Options:
  // 1. Use FFmpeg in Lambda/Worker
  // 2. Use a service like Cloudinary
  // 3. Extract frame at 5 seconds
  
  // For now, return placeholder
  return '/placeholder-video-thumbnail.jpg';
}