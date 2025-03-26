// Server Component wrapper for static generation
import { Metadata } from 'next';
import VisitReportClientPage from './client-page';

// Export metadata for this page
export const metadata: Metadata = {
  title: 'Visit Report',
  description: 'View visit report and details',
};

// Required for static site generation with [id] param
export async function generateStaticParams() {
  // Return a placeholder ID for static generation
  return [{ id: 'placeholder' }];
}

// Server Component for the visit report page
export default function Page(props: any) {
  return <VisitReportClientPage params={props.params} />;
} 