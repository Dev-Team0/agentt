import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { put } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

const SECRET = process.env.NEXTAUTH_SECRET!;

const config = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
};

interface ErrorWithDetails extends Error {
  details?: string;
}

export async function POST(req: NextRequest) {
  console.log('[UploadAPI] Starting file upload process...');
 
  try {
    // 1. Authenticate user session
    console.log('[UploadAPI] Step 1: Authenticating user...');
    const token = await getToken({ req, secret: SECRET });
    const fallbackUser = req.cookies.get('userId')?.value;
    const userId = token?.sub ?? fallbackUser;
   
    if (!userId) {
      console.log('[UploadAPI] ERROR: No user ID found');
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 });
    }

    console.log(`[UploadAPI] User authenticated: ${userId}`);

    // 2. Parse incoming form data
    console.log('[UploadAPI] Step 2: Parsing form data...');
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      console.log('[UploadAPI] ERROR: No file in request');
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    console.log(`[UploadAPI] File received: ${file.name}, size: ${file.size}, type: ${file.type}`);

    // 3. Validate file type
    console.log('[UploadAPI] Step 3: Validating file type...');
    if (!config.allowedTypes.includes(file.type)) {
      console.log(`[UploadAPI] ERROR: Unsupported file type: ${file.type}`);
      return NextResponse.json({
        error: `Unsupported file type: ${file.type}`,
        allowedTypes: config.allowedTypes
      }, { status: 415 });
    }

    // 4. Validate file size
    console.log('[UploadAPI] Step 4: Validating file size...');
    if (file.size > config.maxFileSize) {
      console.log(`[UploadAPI] ERROR: File too large: ${file.size} bytes`);
      return NextResponse.json({
        error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum allowed: ${config.maxFileSize / 1024 / 1024}MB`,
        maxSizeMB: config.maxFileSize / 1024 / 1024
      }, { status: 413 });
    }

    // 5. Check if Blob token is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.log('[UploadAPI] ERROR: BLOB_READ_WRITE_TOKEN not configured');
      return NextResponse.json({ 
        error: 'Blob storage not configured. Please add BLOB_READ_WRITE_TOKEN environment variable.' 
      }, { status: 500 });
    }

    // 6. Upload to Vercel Blob
    console.log('[UploadAPI] Step 6: Uploading to Vercel Blob...');
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const uniqueName = `${userId}/${uuidv4()}.${ext}`;

    try {
      const blob = await put(uniqueName, file, {
        access: 'public'
      });

      console.log(`[UploadAPI] File uploaded successfully to Blob: ${blob.url}`);

      // 7. Respond with file metadata
      console.log(`[UploadAPI] SUCCESS: ${file.name} -> ${blob.url}`);
     
      return NextResponse.json({
        success: true,
        name: file.name,
        type: file.type,
        size: file.size,
        url: blob.url,
        uploadedAt: new Date().toISOString()
      });

    } catch (err) {
      console.error('[UploadAPI] ERROR: Failed to upload to Blob:', err);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

  } catch (err) {
    const error = err as ErrorWithDetails;
    console.error('[UploadAPI] FATAL ERROR:', error);
    console.error('[UploadAPI] Error stack:', error.stack);
   
    return NextResponse.json({
      error: 'Internal server error during upload',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}