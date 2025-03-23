import NextAuth, { DefaultSession } from 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  /**
   * Extending the default session type
   */
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession['user'];
  }

  /**
   * Extending the default user type
   */
  interface User {
    id: string;
    role: string;
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extending the default JWT token type
   */
  interface JWT {
    id: string;
    role: string;
  }
} 