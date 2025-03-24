'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { onAuthChange } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only run auth on client side
    if (typeof window === 'undefined') return;

    try {
      const unsubscribe = onAuthChange((authUser) => {
        setUser(authUser);
        setLoading(false);
      });

      return () => {
        try {
          unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing from auth changes:', error);
        }
      };
    } catch (error) {
      console.error('Failed to set up auth listener:', error);
      setError('Authentication system unavailable. Please try again later.');
      setLoading(false);
      return () => {};
    }
  }, []);

  // Protected routes logic
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    if (!loading) {
      const publicPaths = ['/', '/login', '/register'];
      const isPublicPath = publicPaths.includes(pathname);

      // If there's an auth error, we should still allow access to public paths
      if (error && !isPublicPath) {
        router.push('/login');
        return;
      }

      if (!user && !isPublicPath) {
        // Redirect to login if user is not authenticated and trying to access a protected route
        router.push('/login');
      } else if (user && (pathname === '/login' || pathname === '/register')) {
        // Redirect to dashboard if user is authenticated and trying to access login or register
        router.push('/dashboard');
      }
    }
  }, [user, loading, error, pathname, router]);

  const logout = async () => {
    try {
      // Import dynamically to avoid SSR issues
      const { logout: firebaseLogout } = await import('@/lib/firebase');
      await firebaseLogout();
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      setError('Failed to log out. Please try again.');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext); 