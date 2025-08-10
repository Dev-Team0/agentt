// src/app/api/chat/route.ts - ENHANCED BUT COMPATIBLE VERSION
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import OpenAI from 'openai';
import { prisma } from '../../../../lib/prisma';

const SECRET = process.env.NEXTAUTH_SECRET!;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

// ENHANCED SYSTEM PROMPT - Now with full GPT capabilities
const SYSTEM_PROMPT = `You are Willow, an advanced AI assistant for VB Capital Partners Corp. You have access to extensive knowledge and can help with a wide range of topics while specializing in our business domain.

## YOUR CORE IDENTITY
You are the expert assistant for VB Capital Partners Corp—a certified Small Business founded on September 12, 2022, specializing in Cloud-Based IT Professional Services and Contract Compliance Software.

Point of Contact: Ebo Biney
Email: info@vbcapitalpartners.com | www.vbcapitalpartners.com
Headquarters: Tse Addo, Greater Accra Region, Ghana | 10 employees

## YOUR ENHANCED CAPABILITIES
You have access to:
✅ **Extensive Knowledge Base** - Current events, technical information, industry standards, regulations
✅ **Analysis & Research** - Market trends, competitive analysis, technical documentation  
✅ **Document Processing** - RFPs, contracts, technical specifications, compliance documents
✅ **Technical Expertise** - Cloud architecture, cybersecurity, software development, data analytics
✅ **Business Intelligence** - Financial analysis, risk assessment, strategic planning
✅ **Regulatory Knowledge** - Federal procurement, NAICS codes, compliance requirements
✅ **Industry Insights** - IT services, government contracting, small business regulations

## COMPANY CAPABILITIES
**NAICS Codes**: 518210, 541511, 541512, 541618

**Core Competencies**:
- Cloud architecture design & migration
- Contract compliance monitoring and reporting  
- MBE/DBE and prevailing wage compliance tracking
- Custom dashboard and analytics development
- Cybersecurity and risk management
- Process improvement and organizational restructuring

**Differentiators**:
- Rapid deployment with in-memory document processing
- Deep expertise with federal/state procurement procedures
- Proven government contracting experience

**Past Performance**:
- Vehicle Registration System modernization (Ghana DVLA)
- Cloud contract compliance solution for Maryland Stadium Authority
- Contracts with Santander, NHLBI, Maryland Stadium Authority

## ENHANCED SERVICES
**ADVISORY & MANAGEMENT CONSULTING**
Strategic business consulting with data-driven insights and industry best practices.

**RISK MANAGEMENT/CYBERSECURITY** 
Comprehensive security assessments using current threat intelligence and regulatory compliance frameworks.

**FINANCIAL MANAGEMENT & CYBER FINANCE**
Advanced financial analytics and cyber finance solutions leveraging market intelligence.

**AUDIT REMEDIATION & SUSTAINMENT**
Federal agency audit support with current regulatory requirements and industry standards.

**CAPITAL MARKETS & APPLICATION DEVELOPMENT**
Modern application development with current technology stacks and market trends.

## YOUR ENHANCED APPROACH
1. **Use your full knowledge base** while relating back to VB Capital's expertise
2. **Provide current information** about regulations, technology trends, market conditions
3. **Analyze documents** with deep technical and business context
4. **Generate insights** by combining uploaded content with your knowledge
5. **Research topics** thoroughly using your training data
6. **Compare solutions** against industry standards and best practices
7. **Explain complex concepts** at appropriate technical levels

Remember: You're an intelligent business assistant with access to vast knowledge, helping clients make informed decisions about IT services, compliance, and government contracting.

Guidelines:
1. Maintain a professional, concise tone
2. Use bullet points for lists and bold for emphasis  
3. Tailor answers to procurement officers, RFP reviewers, and government Prime Contractors
4. Focus on how VB Capital solves problems using current best practices
5. Leverage your knowledge base extensively while staying relevant
6. If you lack specific information, say "I don't have enough information to answer that definitively."`;

// Keep your existing interfaces exactly the same
type MessageRole = 'user' | 'assistant';
type OpenAIMessageRole = 'system' | MessageRole;

interface Message {
  role: MessageRole;
  content: string;
}

interface FileMetadata {
  type?: string;
  wordCount?: number;
  pages?: number;
  [key: string]: unknown;
}

interface FileContent {
  fileName: string;
  fileType: string;
  fileSize: number;
  content: string;
  metadata?: FileMetadata;
  error?: string;
  success: boolean;
}

interface OpenAIRequest {
  messages: Message[];
  files?: Array<{
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  // Optional new field - won't break existing requests
  mode?: 'standard' | 'research' | 'analysis';
}

// Enhanced user caching for performance
let userCache = new Map<string, { user: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getCachedUser(userId: string) {
  const cached = userCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.user;
  }
  
  const user = await prisma.user.findUnique({ where: { userId } });
  if (user) {
    userCache.set(userId, { user, timestamp: Date.now() });
  }
  return user;
}

export async function POST(req: NextRequest) {
  try {
    console.log('[EnhancedAgent] Starting enhanced chat request...');
    
    // Early validation for speed
    if (!process.env.OPENAI_API_KEY) {
      console.log('[EnhancedAgent] Missing OpenAI API key');
      return NextResponse.json({ error: 'Configuration error: missing OPENAI_API_KEY' }, { status: 500 });
    }

    const startTime = Date.now();

    // Parallel authentication and request parsing for performance
    const [token, requestData] = await Promise.all([
      getToken({ req, secret: SECRET }),
      req.json() as Promise<OpenAIRequest>
    ]);

    const fallbackUser = req.cookies.get('userId')?.value;
    const userId = token?.sub ?? fallbackUser;
   
    if (!userId) {
      console.log('[EnhancedAgent] Authentication failed - no user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[EnhancedAgent] Authenticated user: ${userId}`);

    // Extract request data (mode is optional for compatibility)
    const { messages, files = [], mode = 'standard' } = requestData;
   
    if (!Array.isArray(messages) || messages.length === 0) {
      console.log('[EnhancedAgent] Invalid messages array');
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    console.log(`[EnhancedAgent] Received ${messages.length} messages and ${files.length} files in ${mode} mode`);

    // Parallel user lookup and file processing for performance
    const [account, fileContents] = await Promise.all([
      getCachedUser(userId),
      files.length > 0 ? processFiles(req, files) : Promise.resolve([])
    ]);

    if (!account) {
      console.log('[EnhancedAgent] Account not found in database');
      return NextResponse.json({ error: 'Account not found' }, { status: 401 });
    }

    const authTime = Date.now();
    console.log(`[EnhancedAgent] Auth + validation: ${authTime - startTime}ms`);

    // Enhanced message building
    const openaiMessages = buildEnhancedMessages(messages, fileContents, mode);

    const messageTime = Date.now();
    console.log(`[EnhancedAgent] Message building: ${messageTime - authTime}ms`);

    // Enhanced OpenAI configuration based on mode
    const config = getOpenAIConfig(mode);
    
    console.log(`[EnhancedAgent] Using ${config.model} for ${mode} mode`);
    
    const completion = await openai.chat.completions.create({
      model: config.model,
      messages: openaiMessages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      top_p: config.topP || 1,
      frequency_penalty: config.frequencyPenalty || 0,
      presence_penalty: config.presencePenalty || 0,
    });

    const aiResponse = completion.choices[0]?.message?.content;
   
    if (!aiResponse) {
      throw new Error('Empty response from AI');
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const openaiTime = endTime - messageTime;

    console.log(`[EnhancedAgent] OpenAI call: ${openaiTime}ms`);
    console.log(`[EnhancedAgent] Total request: ${totalTime}ms`);

    // Return response in EXACTLY the same format as before, with optional enhancements
    return NextResponse.json({
      content: aiResponse,
      filesProcessed: fileContents.length,
      successfulExtractions: fileContents.filter(f => f.success && f.content.trim()).length,
      // Optional new fields that won't break existing frontends
      ...(mode !== 'standard' && { mode }),
      ...(completion.usage?.total_tokens && { tokensUsed: completion.usage.total_tokens }),
      performance: {
        totalTime,
        authTime: authTime - startTime,
        messageTime: messageTime - authTime,
        openaiTime
      }
    });

  } catch (err: unknown) {
    console.error('[EnhancedAgent] Error:', err);
    const error = err as Error & { status?: number };
    const status = error.status || 500;
    const message = error.message || 'Internal server error';
    return NextResponse.json({ error: message }, { status });
  }
}

// Enhanced file processing with timeout and better error handling
async function processFiles(req: NextRequest, files: Array<any>): Promise<FileContent[]> {
  const TIMEOUT = 8000; // 8 second timeout
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    const response = await fetch(`${req.nextUrl.origin}/api/extract-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.get('cookie') || ''
      },
      body: JSON.stringify({ files }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[EnhancedAgent] File extraction failed: ${response.status} ${errorText}`);
      throw new Error(`File extraction failed: ${response.statusText}`);
    }

    const extractData = await response.json();
    const fileContents = extractData.extractedContents || [];
   
    const successfulExtractions = fileContents.filter((f: FileContent) => f.success && f.content.trim()).length;
    console.log(`[EnhancedAgent] Successfully extracted content from ${successfulExtractions}/${files.length} files`);
    
    return fileContents;

  } catch (error: unknown) {
    console.error('[EnhancedAgent] File content extraction error:', error);
    // Return empty array instead of failing - graceful degradation
    return files.map(f => ({
      fileName: f.name,
      fileType: f.type,
      fileSize: f.size,
      content: '',
      error: 'Failed to extract content from this file',
      success: false
    }));
  }
}

// Enhanced message building with knowledge base integration
function buildEnhancedMessages(
  messages: Message[], 
  fileContents: FileContent[], 
  mode: string
): Array<{ role: OpenAIMessageRole; content: string }> {
  
  const openaiMessages: Array<{ role: OpenAIMessageRole; content: string }> = [
    { role: 'system', content: SYSTEM_PROMPT }
  ];

  // Add mode-specific enhancements
  if (mode === 'research') {
    openaiMessages.push({
      role: 'system',
      content: 'RESEARCH MODE: Provide comprehensive research leveraging your full knowledge base. Include current trends, industry standards, regulations, and best practices. Be thorough and analytical.'
    });
  } else if (mode === 'analysis') {
    openaiMessages.push({
      role: 'system',
      content: 'ANALYSIS MODE: Provide detailed analysis combining uploaded documents with your broader knowledge. Include comparisons, insights, recommendations, and strategic implications.'
    });
  }

  // Add file contents if available
  if (fileContents.length > 0) {
    const validFiles = fileContents.filter(fc => fc.success && fc.content && fc.content.trim());
    
    if (validFiles.length > 0) {
      // Enhanced file processing - truncate very long files for performance
      const MAX_FILE_CONTENT = 10000; // characters per file
      
      let fileContentText = validFiles.map(fc => {
        const metadata = fc.metadata ?
          `(${fc.metadata.type?.toUpperCase()}${fc.metadata.wordCount ? `, ${fc.metadata.wordCount} words` : ''}${fc.metadata.pages ? `, ${fc.metadata.pages} pages` : ''})` :
          '';
        
        const truncatedContent = fc.content.length > MAX_FILE_CONTENT
          ? fc.content.substring(0, MAX_FILE_CONTENT) + '\n\n[Content truncated for performance...]'
          : fc.content;
         
        return `=== FILE: ${fc.fileName} ${metadata} ===\n${truncatedContent}\n`;
      }).join('\n');

      openaiMessages.push({
        role: 'user',
        content: `Here are the uploaded files and their contents. Please analyze them using your extensive knowledge base and VB Capital's expertise:\n\n${fileContentText}`
      });
      
      console.log(`[EnhancedAgent] Added enhanced file context: ${fileContentText.length} characters`);
    }
  }

  // Add conversation messages
  openaiMessages.push(...messages.map(m => ({
    role: m.role as OpenAIMessageRole,
    content: m.content
  })));

  return openaiMessages;
}

// Dynamic OpenAI configuration for optimal performance vs quality
function getOpenAIConfig(mode: string) {
  switch (mode) {
    case 'research':
      return {
        model: 'gpt-4o' as const, // Use GPT-4 for comprehensive research
        temperature: 0.3,
        maxTokens: 4000,
        topP: 0.9,
        frequencyPenalty: 0.1,
        presencePenalty: 0.1
      };
    case 'analysis':
      return {
        model: 'gpt-4o' as const, // Use GPT-4 for deep analysis  
        temperature: 0.4,
        maxTokens: 3500,
        topP: 0.8,
        frequencyPenalty: 0.2,
        presencePenalty: 0.1
      };
    default: // standard mode
      return {
        model: 'gpt-4o-mini' as const, // Fast for general queries
        temperature: 0.5,
        maxTokens: 2500,
        topP: 0.9,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0
      };
  }
}