// Server Component for handling static generation
// This file will be the primary entry point for the /dashboard/visits/[id] route

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import VisitDetailClientPage from './client-page';

// Define metadata
export const metadata: Metadata = {
  title: 'Visit Details',
  description: 'View visit details and information',
};

// Generate static paths
export async function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

// By not including a specific type annotation, we rely on Next.js built-in types
// which will correctly handle whatever constraints Next.js imposes
export default function Page({ params }: any) {
  // Validate the ID parameter
  if (!params?.id) {
    notFound();
  }
  
  // Render the client component
  return <VisitDetailClientPage params={params} />;
} 