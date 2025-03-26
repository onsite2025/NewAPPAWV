// Server Component wrapper for static generation
import { Metadata } from 'next';
import EditPatientClientPage from './client-page';

// Export metadata for this page
export const metadata: Metadata = {
  title: 'Edit Patient',
  description: 'Edit patient information',
};

// Required for static site generation with [id] param
export async function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

// Server Component for the edit patient page
// Using any type to avoid Next.js type constraints conflicts
export default function Page(props: any) {
  return <EditPatientClientPage params={props.params} />;
} 