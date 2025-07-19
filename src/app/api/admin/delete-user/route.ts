// src/app/api/admin/delete-user/route.ts


import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';


export async function DELETE(req: NextRequest) {
  try {
    const { userId } = (await req.json()) as { userId?: string };


    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }


    if (userId === 'admin') {
      return NextResponse.json(
        { error: 'Cannot delete admin account' },
        { status: 403 }
      );
    }


    // 1) Remove all of this user’s conversations first
    await prisma.conversation.deleteMany({
      where: { userId },
    });


    // 2) Now delete the user safely
    await prisma.user.delete({
      where: { userId },
    });


    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('User deletion error:', error);
    return NextResponse.json(
      { error: 'Deletion failed' },
      { status: 500 }
    );
  }
}





