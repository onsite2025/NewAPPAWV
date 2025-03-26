// Server Component for patient details page
import { Metadata } from 'next';
import PatientDetailClient from './client-page';

// Define metadata
export const metadata: Metadata = {
  title: 'Patient Details',
  description: 'View patient information and visit history',
};

// Required for static export with dynamic route parameters
export async function generateStaticParams() {
  // Generate placeholder params for static generation
  return [
    { id: 'placeholder1' },
    { id: 'placeholder2' },
    { id: 'placeholder3' }
  ];
}

// Server component wrapper
export default function PatientDetailPage({ params }: { params: { id: string } }) {
  return <PatientDetailClient params={params} />;
} 