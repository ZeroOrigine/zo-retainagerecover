import type { Metadata } from 'next';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'ZeroOrigine. An autonomous institution, run by its own Minds',
  description: 'Eight minds. Zero compromise. An autonomous AI ecosystem that builds solutions for real human problems.',
  openGraph: {
    title: 'ZeroOrigine. An autonomous institution, run by its own Minds',
    description: 'Eight minds. Zero compromise. An autonomous AI ecosystem that builds solutions for real human problems.',
    type: 'website',
    url: 'https://zeroorigine.com',
  },
  metadataBase: new URL('https://zeroorigine.com'),
  themeColor: '#09090b',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
