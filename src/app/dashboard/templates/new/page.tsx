'use client';

// Prevent static rendering of this route
export const dynamic = 'force-dynamic';

import { useState } from 'react';

// Import the client template editor component instead of the server component
import EditTemplateClientPage from '../[id]/edit/client-page';

export default function NewTemplatePage() {
  // Directly render the client template editor
  return <EditTemplateClientPage params={{ id: 'new' }} />;
} 