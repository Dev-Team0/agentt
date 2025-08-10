// src/app/api/chat/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import OpenAI from 'openai';
import { prisma } from '../../../../lib/prisma';

const SECRET = process.env.NEXTAUTH_SECRET!;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

const SYSTEM_PROMPT = `
You are Willow, the expert assistant for VB Capital Partners Corp—a certified Small Business founded on September 12, 2022, specializing in Cloud-Based IT Professional Services and Contract Compliance Software.

Follow these rules:
1. When files are attached, focus on their extracted text
2. Never mention file formats - only content
3. For images, ask clarifying questions if needed
4. Keep responses concise and actionable

Point of Contact(POC): Ebo Biney

Email: info@vbcapitalpartners.com | www.vbcapitalpartners.com

Capability Statement Highlights:
- **NAICS Codes**: 518210, 541511, 541512, 541618
- **Core Competencies**:
  - Cloud architecture design & migration
  - Monitoring and reporting of MBE/DBE and prevailing wage compliance
  - Custom dashboard and analytics development
- **Differentiators**:
  - Rapid deployment with in-memory document processing (no persistent storage)
  - Deep expertise with federal/state procurement procedures
  - Proven track record: contracts with Santander, NHLBI, Maryland Stadium Authority
- **Past Performance**:
  - Vehicle Registration System modernization (Ghana DVLA)
  - Cloud contract compliance solution for Maryland Stadium Authority
- **Company Data**:
  - Headquarters: Tse Addo, Greater Accra Region, Ghana
  - Employees: 10
  - NAICS: as above

OUR CORE SERVICES
ADVISORY & MANAGEMENT CONSULTING
We work as your trusted advisors, helping you identify and tackle core
business issues. Our management consulting approach prioritizes practical,
effective solutions that align with your strategic goals.
RISK MANAGEMENT/CYBERSECURITY
In today's evolving threat landscape, security risks are ever-changing. We
assist our clients in assessing vulnerabilities, prioritizing risks, and developing
comprehensive risk management responses. Our cybersecurity services
focus on safeguarding critical data and ensuring compliance with regulatory
privacy standards.
FINANCIAL MANAGEMENT & CYBER FINANCE
Our finance consultants bring extensive experience across sectors, assisting
clients in streamlining operations, enhancing decision-making, and solving
critical business challenges through actionable insights.
PROCESS IMPROVEMENT & ORGANIZATIONAL
RESTRUCTURING
Through process optimization and organizational restructuring, we help
clients drive efficiencies and improve business outcomes, ensuring
long-term sustainability and agility.

OUR VISION
Our vision at VB Capital Partners is simple: to make
leadership and business easier. We believe that trust
and relationships form the foundation of our work. We
are relentless in our pursuit of excellence, driven by
our commitment to delivering high-quality solutions
that challenge the status quo.
Our consulting approach begins and ends with our
customers, ensuring that their needs and goals guide every step of our process.

OFFERINGS
AUDIT REMEDIATION & SUSTAINMENT
As federal agencies evolve from traditional audit readiness models to a remediation-driven
approach, VB Capital Partners stands at the forefront of this transformation. Our Audit
Remediation & Sustainment Advisory Services are purpose-built to help agencies not only
identify control gaps but also design and implement sustainable solutions that withstand
the rigor of independent audits and OIG reviews. We focus on accelerating issue
remediation lifecycles, strengthening root cause analysis, and operationalizing internal
controls to drive long-term audit sustainability. Leveraging our deep expertise in risk
management, governance frameworks, and control testing, we partner with our clients to
transform audit findings into opportunities for operational resilience and mission assurance.
RISK MANAGEMENT & CONTINUOUS MONITORING
We help organizations implement and sustain robust risk management frameworks,
ensuring that risks are identified, assessed, and managed proactively. Our continuous
monitoring solutions provide the oversight necessary to maintain compliance and
strengthen security postures in real time.
CAPITAL MARKETS & APPLICATION DEVELOPMENT
We provide forward-thinking solutions for clients involved in capital markets and application
development, ensuring seamless integration and alignment with business goals.
ISSUE MANAGEMENT & REMEDIATION
Our experts help organizations navigate and resolve operational issues through tailored
remediation strategies, keeping businesses on track and compliant with industry standards.

Guidelines:
1. Maintain a professional, concise tone.
2. Use bullet points for lists and bold for emphasis.
3. Tailor answers to procurement officers, RFP reviewers, and government Prime Contractors.
4. Focus on how VB Capital solves contract compliance, cloud migration, and reporting challenges.
5. Do not provide financial advice—only factual, capability-based insights.
6. If you lack relevant information, say "I don't have enough information to answer that definitively."
`;

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
}

export async function POST(req: NextRequest) {
  try {
    console.log('[ChatAPI] Starting chat request...');

    // 1. Authentication
    const token = await getToken({ req, secret: SECRET });
    const fallbackUser = req.cookies.get('userId')?.value;
    const userId = token?.sub ?? fallbackUser;
   
    if (!userId) {
      console.log('[ChatAPI] Authentication failed - no user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[ChatAPI] Authenticated user: ${userId}`);

    const account = await prisma.user.findUnique({ where: { userId } });
    if (!account) {
      console.log('[ChatAPI] Account not found in database');
      return NextResponse.json({ error: 'Account not found' }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.log('[ChatAPI] Missing OpenAI API key');
      return NextResponse.json({ error: 'Configuration error: missing OPENAI_API_KEY' }, { status: 500 });
    }

    // 2. Parse request
    const { messages, files = [] } = await req.json() as OpenAIRequest;
   
    if (!Array.isArray(messages) || messages.length === 0) {
      console.log('[ChatAPI] Invalid messages array');
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    console.log(`[ChatAPI] Received ${messages.length} messages and ${files.length} files`);

    // 3. Extract content from uploaded files if any
    let fileContents: FileContent[] = [];
   
    if (files.length > 0) {
      try {
        console.log(`[ChatAPI] Processing ${files.length} uploaded files...`);
       
        const extractResponse = await fetch(`${req.nextUrl.origin}/api/extract-content`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': req.headers.get('cookie') || ''
          },
          body: JSON.stringify({ files })
        });

        if (!extractResponse.ok) {
          const errorText = await extractResponse.text();
          console.error(`[ChatAPI] File extraction failed: ${extractResponse.status} ${errorText}`);
          throw new Error(`File extraction failed: ${extractResponse.statusText}`);
        }

        const extractData = await extractResponse.json();
        fileContents = extractData.extractedContents || [];
       
        const successfulExtractions = fileContents.filter(f => f.success && f.content.trim()).length;
        console.log(`[ChatAPI] Successfully extracted content from ${successfulExtractions}/${files.length} files`);
       
      } catch (error: unknown) {
        console.error('[ChatAPI] File content extraction error:', error);
        // Continue with chat even if file extraction fails, but inform about the files
        fileContents = files.map(f => ({
          fileName: f.name,
          fileType: f.type,
          fileSize: f.size,
          content: '',
          error: 'Failed to extract content from this file',
          success: false
        }));
      }
    }

    // 4. Build OpenAI messages array
    const openaiMessages: { role: OpenAIMessageRole; content: string }[] = [
      { role: 'system', content: SYSTEM_PROMPT }
    ];

    // Add file contents if available - THIS WAS THE ISSUE! ⭐
    if (fileContents.length > 0) {
      let fileContentText = '';
     
      fileContents.forEach(fc => {
        if (fc.success && fc.content && fc.content.trim()) {
          // FIXED: Only include files with actual content
          const metadata = fc.metadata ?
            `(${fc.metadata.type?.toUpperCase()}${fc.metadata.wordCount ? `, ${fc.metadata.wordCount} words` : ''}${fc.metadata.pages ? `, ${fc.metadata.pages} pages` : ''})` :
            '';
         
          fileContentText += `=== FILE: ${fc.fileName} ${metadata} ===\n${fc.content}\n\n`;
        } else if (fc.error) {
          fileContentText += `=== FILE: ${fc.fileName} ===\n[ERROR: ${fc.error}]\n\n`;
        } else {
          fileContentText += `=== FILE: ${fc.fileName} ===\n[No readable content found]\n\n`;
        }
      });

      // FIXED: Only add file content message if we actually have content
      if (fileContentText.trim()) {
        openaiMessages.push({
          role: 'user',
          content: `Here are the uploaded files and their contents:\n\n${fileContentText}`
        });
        console.log(`[ChatAPI] Added file context: ${fileContentText.length} characters`);
      } else {
        console.log(`[ChatAPI] No file content to add to conversation`);
      }
    }

    // Add conversation messages
    openaiMessages.push(...messages.map(m => ({
      role: m.role as OpenAIMessageRole,
      content: m.content
    })));

    // 5. Get AI response
    console.log(`[ChatAPI] Sending ${openaiMessages.length} messages to OpenAI...`);
   
    // DEBUG LOGGING - Let's see what's actually being sent
    console.log('[ChatAPI] DEBUG - Messages being sent to OpenAI:');
    openaiMessages.forEach((msg, index) => {
      console.log(`[ChatAPI] Message ${index}: Role=${msg.role}, Content length=${msg.content.length}`);
      if (msg.role === 'user' && msg.content.includes('FILE:')) {
        console.log(`[ChatAPI] File content preview: ${msg.content.substring(0, 500)}...`);
      }
    });

    console.log(`[ChatAPI] File extraction results:`, JSON.stringify(fileContents.map(fc => ({
      name: fc.fileName,
      success: fc.success,
      contentLength: fc.content?.length || 0,
      error: fc.error
    })), null, 2));
   
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      temperature: 0.7,
      max_tokens: 4000,
    });

    const aiResponse = completion.choices[0]?.message?.content;
   
    if (!aiResponse) {
      throw new Error('Empty response from AI');
    }

    console.log(`[ChatAPI] AI response generated: ${aiResponse.length} characters`);

    // 6. Return response
    return NextResponse.json({
      content: aiResponse,
      filesProcessed: fileContents.length,
      successfulExtractions: fileContents.filter(f => f.success && f.content.trim()).length
    });

  } catch (err: unknown) {
    console.error('[ChatAPI] Error:', err);
    const error = err as Error & { status?: number };
    const status = error.status || 500;
    const message = error.message || 'Internal server error';
    return NextResponse.json({ error: message }, { status });
  }
}