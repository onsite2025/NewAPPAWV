import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

// Configuration for static export
export const dynamic = 'force-dynamic';
export const revalidate = 0; // This means always revalidate

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 