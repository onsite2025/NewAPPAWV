// Server Component for handling static generation
// This file will be the primary entry point for the /dashboard/visits/[id] route

import { Metadata } from 'next';
import VisitDetailClientPage from './client-page';

// Define simple static params
interface StaticParams {
  id: string;
}

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

// Standard Next.js Page component using default pattern without custom types
export default function Page({ params }: { params: { id: string } }) {
  return <VisitDetailClientPage params={params} />;
} 