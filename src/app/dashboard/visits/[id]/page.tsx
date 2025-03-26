// Server Component for handling static generation
// This file will be the primary entry point for the /dashboard/visits/[id] route

import { Metadata } from 'next';
import VisitDetailClientPage from './client-page';

// Define params type for this specific page
type Params = {
  id: string;
};

// This function is required for static site generation with dynamic routes
export async function generateStaticParams(): Promise<Params[]> {
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

// Simpler approach: Use React.FC type and make the component async
// This resolves issues with Promise expectations in Next.js types
export default async function Page(props: { params: { id: string } }) {
  // With an async component, we can await any data fetching here if needed
  // For now, we just pass the params to the client component
  return <VisitDetailClientPage params={props.params} />;
} 