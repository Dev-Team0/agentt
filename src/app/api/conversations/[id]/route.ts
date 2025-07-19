// src/app/api/conversations/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '../../../../../lib/prisma';

const SECRET = process.env.NEXTAUTH_SECRET!;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  // 3) Fetch the conversation, scoped to this user
  const conv = await prisma.conversation.findFirst({
    where: { id: params.id, userId },
    select: { id: true, title: true, time: true, messages: true },
  });

  if (!conv) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(conv);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  // 3) Delete only if it belongs to this user
  await prisma.conversation.deleteMany({
    where: { id: params.id, userId },
  });

  return NextResponse.json({ success: true });
}