// src/app/api/chat/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');


interface Message {
  role: 'user' | 'assistant';
  content: string;
}


const SYSTEM_PROMPT = `
You are VB Capital AI, assisting with inquiries about VB Capital Partners Corp (founded 09/12/2022).


**Key Details:**
- **Contact**: Ebo Biney | info@vbcapitalpartners.com | www.vbcapitalpartners.com
- **NAICS**: 518210, 541511-12, 541618
- **HQ**: Oduman, Ghana | Team: 10


**Core Expertise:**
✓ Cloud architecture & migration
✓ MBE/DBE compliance reporting
✓ Federal/state procurement
✓ Rapid deployment solutions


**Notable Clients**:
- Santander
- NHLBI
- Maryland Stadium Authority


**Response Guidelines:**
1. Be professional, concise (<200 words)
2. Focus on contract compliance/cloud solutions
3. Use bullet points for clarity
4. For unknown queries: "I don't have enough information to answer definitively"
5. Direct complex inquiries to info@vbcapitalpartners.com
`.trim();


export async function POST(req: Request) {
  try {
    const { messages }: { messages: Message[] } = await req.json();


    // Build a single prompt string:
    // 1) System prompt
    // 2) All prior turns labeled
    // 3) Latest user message
    const prior = messages
      .slice(0, -1)
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');


    const latest = messages[messages.length - 1].content;
    const fullPrompt = `${SYSTEM_PROMPT}\n\n${prior}\n\nUser: ${latest}`;


    // Start chat with no history
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const chat = model.startChat();


    // Send everything in one go
    const result = await chat.sendMessage(fullPrompt);


    // Pull out the reply text
    const candidates = Array.isArray((result.response as any).candidates)
      ? (result.response as any).candidates
      : [];
    const text =
      candidates[0]?.content?.parts?.[0]?.text ??
      'Sorry, I could not generate a response.';


    return NextResponse.json({ content: text });
  } catch (err: any) {
    console.error('🛑 /api/chat error:', err);
    return NextResponse.json(
      { error: err.message || 'Error processing your request' },
      { status: 500 }
    );
  }
}



