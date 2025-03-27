import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

// Static export configuration
export const dynamic = 'force-static';
export const fetchCache = 'force-no-store';
export const revalidate = 3600; // Revalidate every hour

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 