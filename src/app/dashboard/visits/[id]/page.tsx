// Server Component for handling static generation
// This file will be the primary entry point for the /dashboard/visits/[id] route

import VisitDetailClientPage from './client-page';

// This function is required for static site generation with dynamic routes
export async function generateStaticParams() {
  try {
    // We'll pre-render a default placeholder page
    // The actual data will be fetched client-side
    return [{ id: 'placeholder' }];
  } catch (error) {
    console.error('Error generating static params:', error);
    return [{ id: 'placeholder' }];
  }
}

// Export the client component as the default export of this page
export default function VisitDetailPage({ params }: { params: { id: string } }) {
  return <VisitDetailClientPage params={params} />;
} 