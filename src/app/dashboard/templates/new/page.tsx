'use client';

// Prevent static rendering of this route
export const dynamic = 'force-dynamic';

import { useState } from 'react';

// Import the actual template editor component
import EditTemplatePage from '../[id]/edit/page';

export default function NewTemplatePage() {
  // Directly render the template editor with no props
  // The editor component will handle the "new" template logic internally
  return <EditTemplatePage />;
} 