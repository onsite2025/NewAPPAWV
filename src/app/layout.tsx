import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

// Load Inter font with extended latin character set and variable settings
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
});

// Load Plus Jakarta Sans as an alternative display font
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: {
    template: '%s | HealthApp',
    default: 'HealthApp - Annual Wellness Visit Platform',
  },
  description: 'A comprehensive platform for healthcare providers to conduct, track, and manage Annual Wellness Visits',
  keywords: ['healthcare', 'wellness', 'annual wellness visit', 'patient management', 'medical', 'health'],
  authors: [{ name: 'HealthApp Team' }],
  creator: 'HealthApp Inc.',
  publisher: 'HealthApp Inc.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0284c7',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`}>
      <body className="font-sans antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
} 