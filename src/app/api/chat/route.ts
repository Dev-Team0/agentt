import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Define proper types
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

// System prompt that defines the AI's behavior based on your capability statement
const SYSTEM_PROMPT = `
You are VB Capital AI, the expert assistant for VB Capital Partners Corp—a certified Small Business founded on September 12, 2022, specializing in Cloud-Based IT Professional Services and Contract Compliance Software.

Capability Statement Highlights:
- **CAGE Code**: [Your CAGE Code]
- **DUNS Number**: [Your DUNS Number]
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
  - Headquarters: Oduman, Greater Accra Region, Ghana
  - Employees: 10
  - NAICS: as above

Guidelines:
1. Maintain a professional, concise tone.
2. Use bullet points for lists and bold for emphasis.
3. Tailor answers to procurement officers, RFP reviewers, and government Prime Contractors.
4. Focus on how VB Capital solves contract compliance, cloud migration, and reporting challenges.
5. Do not provide financial advice—only factual, capability-based insights.
6. If you lack relevant information, say “I don’t have enough information to answer that definitively.”
`;

export async function POST(req: Request) {
  try {
    const { messages }: { messages: Message[] } = await req.json();

    // Initialize the model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Convert messages to Gemini format
    const conversationHistory: GeminiMessage[] = messages
      .map((message) => ({
        role: message.role === 'user' ? 'user' : 'model',
        parts: [{ text: message.content }],
      }));

    // Get the latest user message
    const latestMessage = messages[messages.length - 1];

    // Combine system prompt and user input
    const fullPrompt = `${SYSTEM_PROMPT}\n\nUser: ${latestMessage.content}`;

    // Start a chat with context
    const chat = model.startChat({
      history: conversationHistory.slice(0, -1),
    });

    // Generate the assistant’s response
    const result = await chat.sendMessage(fullPrompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({
      role: 'assistant',
      content: text
    });

  } catch (error) {
    console.error("Error calling Gemini:", error);
    return NextResponse.json(
      { error: "Error processing your request" },
      { status: 500 }
    );
  }
}
