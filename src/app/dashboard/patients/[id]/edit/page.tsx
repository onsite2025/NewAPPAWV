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
export default function Page(props: {
  params: { id: string }
}) {
  return <EditPatientClientPage params={props.params} />;
} 