// Server Component for handling static generation
// This file will be the primary entry point for the /dashboard/visits/[id] route

import { Metadata } from 'next';
import VisitDetailClientPage from './client-page';
import { notFound } from 'next/navigation';

// Define the expected params shape
export interface VisitDetailPageParams {
  id: string;
}

// This function is required for static site generation with dynamic routes
export async function generateStaticParams(): Promise<VisitDetailPageParams[]> {
  // We'll pre-render a default placeholder page
  return [{ id: 'placeholder' }];
}

// Export metadata for this page
export const metadata: Metadata = {
  title: 'Visit Details',
  description: 'View visit details and information',
};

// Standard pattern for Next.js App Router pages
export default function VisitDetailPage({
  params,
}: {
  params: VisitDetailPageParams;
}) {
  // Validate the ID parameter
  if (!params.id) {
    notFound();
  }
  
  // Render the client component
  return <VisitDetailClientPage params={params} />;
} 