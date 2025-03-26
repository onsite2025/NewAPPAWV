'use client';

// Remove force-dynamic export since we're using client component
// export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';

// Define generateMetadata to prevent build errors
export const generateMetadata = () => {
  return {
    title: 'Registration Temporarily Unavailable - Annual Wellness Visit',
    description: 'Registration is currently unavailable. Please contact an administrator for assistance.'
  };
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Registration</h1>
          <p className="mt-2 text-gray-600">
            Registration is only available through invitation
          </p>
        </div>
        
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="text-center space-y-4">
            <div className="text-gray-700 text-xl">
              Registration is only available through invitation links sent by administrators.
            </div>
            <p className="text-gray-500">
              If you received an invitation email, please use the link provided in that email.
              If you need an invitation, please contact your administrator.
            </p>
            <div className="mt-4">
              <Link href="/login" className="text-blue-600 hover:text-blue-800">
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 