'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// This function is required for static site generation with dynamic routes
export function generateStaticParams() {
  // For static export, we need to provide a list of possible token values
  // Since these are dynamic and generated at runtime, we'll provide a placeholder
  // that will allow the page to be built statically
  return [{ token: 'placeholder-token' }];
}

export default function RegisterWithTokenPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const { token } = params;
  
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [role, setRole] = useState('');

  // Verify the invitation token
  useEffect(() => {
    async function verifyToken() {
      try {
        // Get email from URL query parameter
        const urlParams = new URLSearchParams(window.location.search);
        const emailParam = urlParams.get('email');
        
        if (!emailParam) {
          setError('Email is required for verification');
          setIsVerifying(false);
          return;
        }
        
        setEmail(emailParam);
        
        const response = await fetch(`/.netlify/functions/api/verify-invitation?token=${token}&email=${encodeURIComponent(emailParam)}`);
        const data = await response.json();
        
        if (data.success) {
          setIsValid(true);
          setRole(data.data?.role || 'staff');
        } else {
          setError(data.error || 'Invalid or expired invitation');
        }
      } catch (error) {
        console.error('Error verifying invitation:', error);
        setError('Failed to verify invitation. Please try again.');
      } finally {
        setIsVerifying(false);
      }
    }
    
    verifyToken();
  }, [token]);

  // Handle registration form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await fetch('/.netlify/functions/api/register-with-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          email,
          name,
          password
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Registration successful, redirect to login
        router.push('/login?registered=true');
      } else {
        setError(data.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Error registering user:', error);
      setError('Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Complete Registration</h1>
          <p className="mt-2 text-gray-600">
            Create your account to get started
          </p>
        </div>
        
        {isVerifying ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : isValid ? (
          <div className="bg-white p-8 rounded-lg shadow-md">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 p-4 rounded-md text-red-500">
                  {error}
                </div>
              )}
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Email address cannot be changed
                </p>
              </div>
              
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <div className="mt-1 py-2 px-3 border border-gray-200 rounded-md bg-gray-50">
                  {role === 'admin' && 'Administrator'}
                  {role === 'provider' && 'Doctor/Provider'}
                  {role === 'staff' && 'Staff'}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Your role has been assigned by the administrator
                </p>
              </div>
              
              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating Account...' : 'Complete Registration'}
                </button>
              </div>
            </form>
            
            <div className="mt-4 text-center">
              <Link href="/login" className="text-sm text-blue-600 hover:text-blue-800">
                Already have an account? Sign in
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-lg shadow-md">
            <div className="text-center space-y-4">
              <div className="text-red-500 text-xl">
                {error || 'Invalid or expired invitation'}
              </div>
              <p>
                Please contact your administrator to request a new invitation link.
              </p>
              <div className="mt-4">
                <Link href="/login" className="text-blue-600 hover:text-blue-800">
                  Go to Login
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 