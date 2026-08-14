// CANONICAL root layout for RetainageRecover.
import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import ZoBeacon from '@/components/ZoBeacon';
import './globals.css';

// #100: a descendant reads URL search params (useSearchParams); opt this
// route out of static generation so `next build` does not CSR-bail.
export const dynamic = 'force-dynamic';

const bodyFont = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
const displayFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 5 };

export const metadata: Metadata = {
  title: 'RetainageRecover: invoice every retainage release on time',
  description:
    'Track retainage on every job, see the exact date each release becomes eligible, and send the release invoice the day you can. Stop leaving 5 to 10 percent of your contract value uncollected.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable}`}>
      <body className="font-sans antialiased bg-slate-50 text-slate-900">
        {children}
        <ZoBeacon />
      </body>
    </html>
  );
}
