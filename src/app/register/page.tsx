'use client';

// Remove force-dynamic export since we're using client component
// export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';

// Remove the generateMetadata export as it's not allowed in client components
// Metadata must be defined in server components

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Registration</h1>
          <p className="mt-2 text-gray-600">
            Registration functionality is currently disabled
          </p>
        </div>
        
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="text-center space-y-4">
            <div className="text-gray-700 text-xl">
              Registration is currently disabled
            </div>
            <p className="text-gray-500">
              The invitation and registration functionality has been temporarily disabled.
              Please contact the administrator for assistance.
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