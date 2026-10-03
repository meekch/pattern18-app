import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import BetaBanner from '@/components/BetaBanner';
import QuickExit from '@/components/QuickExit';

export const metadata: Metadata = {
  metadataBase: new URL('https://pattern18.com'),
  title: 'Pattern18 — AI Case Pattern Analysis for Family Law Attorneys',
  description:
    'AI-powered case pattern analysis for family law attorneys handling high-conflict custody. Built for Arizona\'s new coercive control law. Pattern18 Certified firms give clients free access.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Pattern18',
    statusBarStyle: 'default',
  },
  icons: {
    apple: [{ url: '/apple-icon', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'Pattern18 — AI Case Pattern Analysis for Family Law Attorneys',
    description:
      'Case pattern analysis built for attorneys and the new coercive control law. Document DARVO, gaslighting, and coercive control patterns — court-ready, firm-branded.',
    url: 'https://pattern18.com',
    siteName: 'Pattern18',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pattern18 — AI Case Pattern Analysis for Family Law Attorneys',
    description:
      'Case pattern analysis built for attorneys and the new coercive control law. Document DARVO, gaslighting, and coercive control patterns — court-ready, firm-branded.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read at server-render time. Default: true (show banner) unless the
  // env var is explicitly 'false'. Flip BETA_BANNER_ENABLED=false in
  // Vercel to globally kill the banner without a code deploy.
  const betaBannerEnabled = process.env.BETA_BANNER_ENABLED !== 'false';

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <BetaBanner enabled={betaBannerEnabled} />
        <QuickExit />
        {children}
        <Script strategy="afterInteractive" src="https://connect.facebook.net/en_US/fbevents.js" />
        <Script id="facebook-pixel" strategy="afterInteractive">
          {`
            fbq('init', '1405174431383478');
            fbq('track', 'PageView');
          `}
        </Script>
      </body>
    </html>
  );
}
