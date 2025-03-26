// Server Component for handling static generation
// This file will be the primary entry point for the /dashboard/visits/[id] route

import { Metadata } from 'next';
import VisitDetailClientPage from './client-page';

// Define params type for this specific page
type VisitDetailParams = {
  id: string;
};

// This function is required for static site generation with dynamic routes
export async function generateStaticParams(): Promise<VisitDetailParams[]> {
  try {
    // We'll pre-render a default placeholder page
    // The actual data will be fetched client-side
    return [{ id: 'placeholder' }];
  } catch (error) {
    console.error('Error generating static params:', error);
    return [{ id: 'placeholder' }];
  }
}

// Export metadata for this page
export const metadata: Metadata = {
  title: 'Visit Details',
  description: 'View visit details and information',
};

// Export the client component as the default export of this page
// Non-async function to avoid Promise type issues
export default function VisitDetailPage({ 
  params 
}: { 
  params: VisitDetailParams;
}) {
  return <VisitDetailClientPage params={params} />;
} 