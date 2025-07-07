// src/app/api/auth/[...nextauth]/route.ts

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/authOptions'; // or relative path

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; // ✅ ONLY export this
