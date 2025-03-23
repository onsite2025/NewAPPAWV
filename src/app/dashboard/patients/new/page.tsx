'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function NewPatientPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the edit page with 'new' as the ID
    router.push('/dashboard/patients/new/edit');
  }, [router]);
  
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
      <div className="card">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
} 