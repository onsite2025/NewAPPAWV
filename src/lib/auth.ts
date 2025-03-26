import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { safeConnectToDatabase, isBuildTime } from '@/lib/prerender-workaround';
import bcrypt from 'bcryptjs';

// Using dynamic imports to prevent issues during build time
let User: any;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        
        // Skip actual auth during build time
        if (isBuildTime()) {
          console.log('Build time detected - skipping actual auth');
          return {
            id: 'mock-id',
            email: credentials.email,
            name: 'Mock User',
            role: 'user',
          };
        }
        
        try {
          await safeConnectToDatabase();
          
          // Dynamically import User model only when needed
          if (!User) {
            const UserModule = await import('@/models/User');
            User = UserModule.default;
          }
          
          // Find user by email
          const user = await User.findOne({ email: credentials.email });
          
          if (!user) {
            return null;
          }
          
          // Check password
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );
          
          if (!isPasswordValid) {
            return null;
          }
          
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error('Authentication error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-fallback-secret-do-not-use-in-production',
}; 