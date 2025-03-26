// Server Component for handling static generation
// This file will be the primary entry point for the /dashboard/visits/[id] route

import { Metadata } from 'next';
import VisitDetailClientPage from './client-page';
import { notFound } from 'next/navigation';

// This simplified approach minimizes type conflicts
// Just export what's strictly necessary without complex typings
export async function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

// Export metadata for this page
export const metadata: Metadata = {
  title: 'Visit Details',
  description: 'View visit details and information',
};

// Make the component async - this is key for Server Components in Next.js App Router
export default async function Page({
  params,
}: {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  // Validate the ID parameter
  if (!params.id) {
    notFound();
  }
  
  // Render the client component
  return <VisitDetailClientPage params={params} />;
} 