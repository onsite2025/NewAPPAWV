// This file handles static generation for the visits/[id]/report dynamic route

export async function generateStaticParams() {
  try {
    // We'll pre-render a default placeholder page
    // The actual data will be fetched client-side
    return [{ id: 'placeholder' }];
  } catch (error) {
    console.error('Error generating static params:', error);
    return [{ id: 'placeholder' }];
  }
} 