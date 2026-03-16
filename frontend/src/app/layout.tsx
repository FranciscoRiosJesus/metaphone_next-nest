import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Athlete Dedup Manager',
  description: 'Add athletes with robust deduplication',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
