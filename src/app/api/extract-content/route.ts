import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { FileContentExtractor } from '@/lib/fileProcessing';

export const dynamic = 'force-dynamic';

const SECRET = process.env.NEXTAUTH_SECRET!;

interface FileToProcess {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface ExtractRequest {
  files: FileToProcess[];
}

interface ExtractedContent {
  fileName: string;
  fileType: string;
  fileSize: number;
  content: string;
  metadata?: Record<string, unknown>;
  error?: string;
  success: boolean;
}

export async function POST(req: NextRequest) {
  try {
    console.log('[ExtractAPI] Starting file content extraction...');

    // 1. Authenticate user
    const token = await getToken({ req, secret: SECRET });
    const fallbackUser = req.cookies.get('userId')?.value;
    const userId = token?.sub ?? fallbackUser;
   
    if (!userId) {
      console.log('[ExtractAPI] Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[ExtractAPI] Authenticated user: ${userId}`);

    // 2. Parse request body
    const { files } = await req.json() as ExtractRequest;
   
    if (!files || !Array.isArray(files) || files.length === 0) {
      console.log('[ExtractAPI] No files provided');
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    console.log(`[ExtractAPI] Received ${files.length} files to process`);

    // 3. Process each file
    const extractedContents: ExtractedContent[] = [];
   
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`[ExtractAPI] Processing file ${i + 1}/${files.length}: ${file.name}`);
      console.log(`[ExtractAPI] File details:`, {
        name: file.name,
        url: file.url,
        type: file.type,
        size: file.size
      });

      try {
        const content = await FileContentExtractor.extractContent(file.url, file.type);
        extractedContents.push({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          content: content.text,
          metadata: content.metadata,
          success: true
        });
        console.log(`[ExtractAPI] Successfully extracted content from ${file.name}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[ExtractAPI] Failed to extract content from ${file.name}:`, errorMessage);
        extractedContents.push({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          content: '',
          error: errorMessage,
          success: false
        });
      }
    }

    console.log(`[ExtractAPI] Completed processing ${files.length} files`);

    return NextResponse.json({
      success: true,
      filesProcessed: files.length,
      extractedContents: extractedContents
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ExtractAPI] Processing error:', errorMessage);
    return NextResponse.json({
      error: 'Failed to process files',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}
