// src/app/api/upload/route.ts - Debug version
import { writeFile, mkdir, stat, unlink } from 'fs/promises';
import { join } from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
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
  ],
  uploadDir: join(process.cwd(), 'public/uploads')
};


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


    // 5. Ensure upload directory exists
    console.log('[UploadAPI] Step 5: Creating upload directory...');
    try {
      await mkdir(config.uploadDir, { recursive: true });
      console.log(`[UploadAPI] Upload directory ready: ${config.uploadDir}`);
    } catch (err) {
      console.error('[UploadAPI] ERROR: Failed to create upload directory:', err);
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }


    // 6. Write file to disk
    console.log('[UploadAPI] Step 6: Writing file to disk...');
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const uniqueName = `${uuidv4()}.${ext}`;
    const filePath = join(config.uploadDir, uniqueName);


    try {
      await writeFile(filePath, buffer);
      console.log(`[UploadAPI] File written successfully: ${filePath}`);
    } catch (err) {
      console.error('[UploadAPI] ERROR: Failed to write file:', err);
      return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
    }


    // 7. Verify the file was saved
    console.log('[UploadAPI] Step 7: Verifying file...');
    try {
      const fileStat = await stat(filePath);
      if (fileStat.size === 0) {
        console.log('[UploadAPI] ERROR: File saved but appears empty');
        await unlink(filePath);
        return NextResponse.json({ error: 'File saved but appears empty' }, { status: 500 });
      }
      console.log(`[UploadAPI] File verified: ${fileStat.size} bytes`);
    } catch (err) {
      console.error('[UploadAPI] ERROR: Failed to verify file:', err);
      return NextResponse.json({ error: 'File verification failed' }, { status: 500 });
    }


    // 8. Respond with file metadata
    const fileUrl = `/uploads/${uniqueName}`;
   
    console.log(`[UploadAPI] SUCCESS: ${file.name} -> ${fileUrl}`);
   
    return NextResponse.json({
      success: true,
      name: file.name,
      type: file.type,
      size: file.size,
      url: fileUrl,
      uploadedAt: new Date().toISOString()
    });


  } catch (err: any) {
    console.error('[UploadAPI] FATAL ERROR:', err);
    console.error('[UploadAPI] Error stack:', err.stack);
   
    return NextResponse.json({
      error: 'Internal server error during upload',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

