interface ExtractedContent {
  text: string;
  metadata?: {
    pages?: number;
    wordCount?: number;
    type: string;
    confidence?: number;
    originalSize?: number;
    processing?: string;
    error?: string;
  };
}

interface PDFParseResult {
  text: string;
  numpages: number;
}

interface MammothResult {
  value: string;
}

interface TesseractResult {
  data: {
    text: string;
    confidence: number;
  };
}

interface TesseractLogger {
  status: string;
  progress: number;
}

export class FileContentExtractor {
  // Helper method to fetch file buffer from URL (works with both local and blob URLs)
  static async fetchFileBuffer(fileUrl: string): Promise<Buffer> {
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      // Fetch from remote URL (Vercel Blob or other cloud storage)
      console.log(`[FileExtractor] Fetching from remote URL: ${fileUrl}`);
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } else {
      // Local file path (for development)
      const { readFile } = await import('fs/promises');
      const { join } = await import('path');
      const { existsSync } = await import('fs');
      
      const cleanPath = fileUrl.startsWith('/') ? fileUrl.substring(1) : fileUrl;
      const fullPath = join(process.cwd(), 'public', cleanPath);
      
      if (!existsSync(fullPath)) {
        throw new Error(`File not found: ${fullPath}`);
      }
      
      return await readFile(fullPath);
    }
  }

  // Extract text from PDF files
  static async extractFromPDF(fileUrl: string): Promise<ExtractedContent> {
    try {
      const pdf = await import('pdf-parse');
      const dataBuffer = await this.fetchFileBuffer(fileUrl);
      const data = await pdf.default(dataBuffer) as PDFParseResult;
     
      return {
        text: data.text.trim(),
        metadata: {
          pages: data.numpages,
          wordCount: data.text.split(/\s+/).length,
          type: 'pdf'
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('PDF extraction error:', errorMessage);
      throw new Error('Failed to extract text from PDF');
    }
  }

  // Extract text from DOCX files
  static async extractFromDOCX(fileUrl: string): Promise<ExtractedContent> {
    try {
      const mammoth = await import('mammoth');
      const dataBuffer = await this.fetchFileBuffer(fileUrl);
      const result = await mammoth.extractRawText({ buffer: dataBuffer }) as MammothResult;
     
      return {
        text: result.value.trim(),
        metadata: {
          wordCount: result.value.split(/\s+/).length,
          type: 'docx'
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('DOCX extraction error:', errorMessage);
      throw new Error('Failed to extract text from DOCX');
    }
  }

  // Extract text from DOC files (legacy Word format)
  static async extractFromDOC(fileUrl: string): Promise<ExtractedContent> {
    try {
      const mammoth = await import('mammoth');
      const dataBuffer = await this.fetchFileBuffer(fileUrl);
      const result = await mammoth.extractRawText({ buffer: dataBuffer }) as MammothResult;
     
      return {
        text: result.value.trim() || 'Could not extract text from legacy DOC format. Please convert to DOCX.',
        metadata: {
          type: 'doc'
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('DOC extraction error:', errorMessage);
      return {
        text: 'Unable to extract text from legacy DOC format. Please convert to DOCX or PDF.',
        metadata: { type: 'doc', error: errorMessage }
      };
    }
  }

  // Extract text from plain text files
  static async extractFromTXT(fileUrl: string): Promise<ExtractedContent> {
    try {
      const dataBuffer = await this.fetchFileBuffer(fileUrl);
      const content = dataBuffer.toString('utf-8');
     
      return {
        text: content.trim(),
        metadata: {
          wordCount: content.split(/\s+/).length,
          type: 'txt'
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('TXT extraction error:', errorMessage);
      throw new Error('Failed to read text file');
    }
  }

  // Safe image processing with OpenAI Vision API
  static async extractFromImage(fileUrl: string, fileSize?: number): Promise<ExtractedContent> {
    console.log(`[FileExtractor] Processing image: ${fileUrl}`);
   
    try {
      // Try Vision API first (if available and configured)
      if (process.env.OPENAI_API_KEY) {
        try {
          console.log(`[FileExtractor] Attempting Vision API analysis...`);
          return await this.analyzeImageWithVisionAPI(fileUrl, fileSize);
        } catch (visionError) {
          const errorMessage = visionError instanceof Error ? visionError.message : 'Unknown error';
          console.warn(`[FileExtractor] Vision API failed: ${errorMessage}`);
          // Continue to OCR fallback
        }
      }

      // Fallback to OCR if Vision API fails or isn't available
      try {
        console.log(`[FileExtractor] Attempting OCR analysis...`);
        return await this.extractTextWithOCR(fileUrl, fileSize);
      } catch (ocrError) {
        const errorMessage = ocrError instanceof Error ? ocrError.message : 'Unknown error';
        console.warn(`[FileExtractor] OCR failed: ${errorMessage}`);
        // Continue to basic fallback
      }

      // Final fallback - basic image info
      console.log(`[FileExtractor] Using basic image info fallback...`);
      return this.getBasicImageInfo(fileUrl, fileSize);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[FileExtractor] All image processing methods failed:`, errorMessage);
     
      return {
        text: 'I can see that you\'ve uploaded an image file, but I\'m unable to process it at the moment. Please describe what you see in the image, and I\'ll be happy to help with any questions or analysis.',
        metadata: {
          type: 'image',
          processing: 'all_methods_failed',
          error: errorMessage
        }
      };
    }
  }

  // Vision API analysis using file URL
  static async analyzeImageWithVisionAPI(fileUrl: string, fileSize?: number): Promise<ExtractedContent> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Dynamic import to avoid issues if OpenAI package isn't available
    const OpenAI = await import('openai');
    const openai = new OpenAI.default({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000 // 30 second timeout
    });

    // For blob URLs, we can pass them directly to OpenAI
    // For local URLs, we need to convert to base64
    let imageUrl = fileUrl;
    
    if (!fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
      // Convert local file to base64 for OpenAI
      const imageBuffer = await this.fetchFileBuffer(fileUrl);
      const base64Image = imageBuffer.toString('base64');
      
      const extension = fileUrl.split('.').pop()?.toLowerCase();
      const mimeType = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'gif': 'image/gif'
      }[extension || 'jpg'] || 'image/jpeg';
      
      imageUrl = `data:${mimeType};base64,${base64Image}`;
    }

    // Call Vision API
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this image in detail. Describe what you see, including objects, text (if any), colors, context, and any relevant information. If this appears to be a medical, technical, or specialized item, please provide relevant details about its purpose and characteristics."
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    });

    const description = response.choices[0]?.message?.content;
   
    if (!description) {
      throw new Error('Empty response from Vision API');
    }

    return {
      text: description.trim(),
      metadata: {
        type: 'image',
        processing: 'vision_api_success',
        wordCount: description.trim().split(/\s+/).length,
        originalSize: fileSize
      }
    };
  }

  // OCR analysis fallback
  static async extractTextWithOCR(fileUrl: string, fileSize?: number): Promise<ExtractedContent> {
    const Tesseract = await import('tesseract.js');
   
    // Tesseract can work with URLs directly for remote files
    const result = await Tesseract.recognize(fileUrl, 'eng', {
      logger: (m: TesseractLogger) => {
        if (m.status === 'recognizing text' && m.progress % 0.2 < 0.1) {
          console.log(`[FileExtractor] OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    }) as TesseractResult;
   
    const extractedText = result.data.text.trim();
   
    if (!extractedText) {
      return {
        text: 'This image does not appear to contain readable text. The image has been uploaded successfully, but no text content was detected through OCR analysis.',
        metadata: {
          type: 'image',
          confidence: result.data.confidence,
          processing: 'ocr_no_text_found',
          originalSize: fileSize
        }
      };
    }
   
    return {
      text: `Text extracted from image:\n\n${extractedText}`,
      metadata: {
        wordCount: extractedText.split(/\s+/).length,
        type: 'image',
        confidence: Math.round(result.data.confidence),
        processing: 'ocr_success',
        originalSize: fileSize
      }
    };
  }

  // Basic image info fallback
  static getBasicImageInfo(fileUrl: string, fileSize?: number): ExtractedContent {
    const fileName = fileUrl.split('/').pop() || 'image';
    const sizeKB = fileSize ? Math.round(fileSize / 1024) : 'unknown';
    const extension = fileName.split('.').pop()?.toUpperCase() || 'IMAGE';
   
    return {
      text: `I can see that you've uploaded an image file named "${fileName}" (${extension} format${fileSize ? `, ${sizeKB}KB` : ''}). While I cannot analyze the visual content of the image at the moment, I'm ready to help if you can describe what's in the image or let me know what specific information you're looking for.`,
      metadata: {
        type: 'image',
        processing: 'basic_info_only',
        originalSize: fileSize
      }
    };
  }

  // Main extraction method with comprehensive error handling
  static async extractContent(fileUrl: string, mimeType: string, fileSize?: number): Promise<ExtractedContent> {
    console.log(`[FileExtractor] Processing file: ${fileUrl}`);
    console.log(`[FileExtractor] MIME type: ${mimeType}`);
   
    try {
      switch (mimeType) {
        case 'application/pdf':
          console.log(`[FileExtractor] Extracting PDF content...`);
          return await this.extractFromPDF(fileUrl);
         
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          console.log(`[FileExtractor] Extracting DOCX content...`);
          return await this.extractFromDOCX(fileUrl);
         
        case 'application/msword':
          console.log(`[FileExtractor] Extracting DOC content...`);
          return await this.extractFromDOC(fileUrl);
         
        case 'text/plain':
          console.log(`[FileExtractor] Reading text file...`);
          return await this.extractFromTXT(fileUrl);
         
        case 'image/jpeg':
        case 'image/png':
        case 'image/webp':
        case 'image/gif':
          console.log(`[FileExtractor] Processing image file...`);
          return await this.extractFromImage(fileUrl, fileSize);
         
        default:
          throw new Error(`Unsupported file type: ${mimeType}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[FileExtractor] Processing error:`, errorMessage);
      throw new Error(`Failed to process ${mimeType}: ${errorMessage}`);
    }
  }
}