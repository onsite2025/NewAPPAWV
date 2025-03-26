import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

// Static export configuration - changed from force-dynamic to auto
export const dynamic = 'auto';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 