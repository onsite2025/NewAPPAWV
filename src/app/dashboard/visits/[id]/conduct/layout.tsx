'use client';

import ErrorBoundary from '@/components/ErrorBoundary';

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