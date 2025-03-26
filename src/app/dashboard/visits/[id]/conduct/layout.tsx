// Server Component - no 'use client' directive
import ErrorBoundary from '@/components/ErrorBoundary';

// This function is required for static site generation with dynamic routes
export async function generateStaticParams() {
  // Return placeholder IDs for static generation
  return [
    { id: 'placeholder1' },
    { id: 'placeholder2' },
    { id: 'placeholder3' }
  ];
}

export default function ConductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
} 