// src/app/api/conversations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '../../../../lib/prisma';

const SECRET = process.env.NEXTAUTH_SECRET!;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export async function GET(req: NextRequest) {
  console.log('🧩 cookie header:', req.headers.get('cookie'));

  // 1) Try NextAuth token
  const token = await getToken({ req, secret: SECRET });
  console.log('🧩 parsed JWT token:', token);

  // 2) Fallback to your test cookie "userId"
  const fallbackUser = req.cookies.get('userId')?.value;
  const userId = token?.sub ?? fallbackUser;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 3) Verify the user still exists
  const account = await prisma.user.findUnique({ where: { userId } });
  if (!account) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const convs = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, time: true, messages: true },
    });
    return NextResponse.json(convs);
  } catch (err) {
    console.error('GET /api/conversations error:', err);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  console.log('🧩 cookie header:', req.headers.get('cookie'));

  // 1) Authenticate
  const token = await getToken({ req, secret: SECRET });
  console.log('🧩 parsed JWT token:', token);
  const fallbackUser = req.cookies.get('userId')?.value;
  const userId = token?.sub ?? fallbackUser;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2) Verify the user still exists
  const account = await prisma.user.findUnique({ where: { userId } });
  if (!account) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // title is now optional on updates
    const { id, title, messages } = (await req.json()) as {
      id?: string;
      title?: string;
      messages: Message[];
    };

    const now = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (id) {
      // ─── UPDATE EXISTING ───────────────────────────────────────────
      const data: any = {
        messages: JSON.parse(JSON.stringify(messages)),
        time: now,
      };
      // only overwrite title if provided (i.e., on first create or explicit change)
      if (title) {
        data.title = title;
      }

      await prisma.conversation.update({
        where: { id },
        data,
      });

      return NextResponse.json({ id });
    } else {
      // ─── CREATE NEW ───────────────────────────────────────────────
      const conv = await prisma.conversation.create({
        data: {
          userId,
          title: title ?? 'New Conversation',
          messages: JSON.parse(JSON.stringify(messages)),
          time: now,
        },
      });
      return NextResponse.json({ id: conv.id });
    }
  } catch (err) {
    console.error('POST /api/conversations error:', err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}

