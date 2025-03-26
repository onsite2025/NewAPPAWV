// This file contains the generateStaticParams function for the /register/[token] route
// It must be separate from the page.tsx file because that file uses 'use client'

export function generateStaticParams() {
  // For static export, we need to provide a list of possible token values
  // Since these are dynamic and generated at runtime, we'll provide a placeholder
  // that will allow the page to be built statically
  return [{ token: 'placeholder-token' }];
} 