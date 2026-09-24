import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Revora — Multi-Agent GTM and CRM Automation Platform',
  description: 'Autonomous multi-agent intelligence operating system for modern revenue teams.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <main>{children}</main>
      </body>
    </html>
  );
}
