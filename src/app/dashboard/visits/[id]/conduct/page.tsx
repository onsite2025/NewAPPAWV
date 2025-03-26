// Server Component - no 'use client' directive
import { Metadata } from 'next';
import ConductVisitClientPage from './client-page';

// Define metadata for this page
export const metadata: Metadata = {
  title: 'Conduct Visit',
  description: 'Annual wellness visit assessment',
};

// This function is required for static site generation with [id] param
export async function generateStaticParams() {
  // Return placeholder IDs for static generation
  // These IDs will be used at build time to generate static pages
  return [
    { id: 'placeholder1' },
    { id: 'placeholder2' },
    { id: 'placeholder3' }
  ];
}

// Server component wrapper
export default function ConductVisitPage({ params }: { params: { id: string } }) {
  return (
    <ConductVisitClientPage params={params} />
  );
}