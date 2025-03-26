// Server Component for handling static generation
// This file will be the primary entry point for the /dashboard/visits/[id] route

import { Metadata } from 'next';
import VisitDetailClientPage from './client-page';
import { notFound } from 'next/navigation';

// Properly defining types for Next.js App Router
type PageParams = {
  id: string;
};

// Define metadata
export const metadata: Metadata = {
  title: 'Visit Details',
  description: 'View visit details and information',
};

// Generate static paths
export async function generateStaticParams(): Promise<PageParams[]> {
  return [{ id: 'placeholder' }];
}

// Page component with proper Next.js types - simplified to avoid type conflicts
export default function Page({ params }: { params: PageParams }) {
  // Validate the ID parameter
  if (!params.id) {
    notFound();
  }
  
  // Render the client component
  return <VisitDetailClientPage params={params} />;
} 