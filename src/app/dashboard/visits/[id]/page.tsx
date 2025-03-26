// Server Component for handling static generation
// This file will be the primary entry point for the /dashboard/visits/[id] route

import { Metadata } from 'next';
import VisitDetailClientPage from './client-page';

// This function is required for static site generation with dynamic routes
export async function generateStaticParams() {
  // We'll pre-render a default placeholder page
  return [{ id: 'placeholder' }];
}

// Export metadata for this page
export const metadata: Metadata = {
  title: 'Visit Details',
  description: 'View visit details and information',
};

// Server component must be async to match Next.js expected typing pattern
export default async function Page({ params }: { params: { id: string } }) {
  // Now we can use await here if needed for data fetching
  // For now, we're just returning the client component
  return <VisitDetailClientPage params={params} />;
} 