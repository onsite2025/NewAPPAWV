// Server Component for static generation
import { Metadata } from 'next';
import EditTemplateClientPage from './client-page';

// Export metadata for this page
export const metadata: Metadata = {
  title: 'Edit Template',
  description: 'Create or edit assessment template',
};

// Required for static site generation with [id] param
export async function generateStaticParams() {
  // Return a placeholder ID for static generation
  return [{ id: 'placeholder' }];
}

// Server Component for the template edit page
export default function Page({ params }: { params: { id: string } }) {
  return <EditTemplateClientPage params={params} />;
}
