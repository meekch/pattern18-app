import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://pattern18.com'),
  title: 'Pattern18. Your 24/7 AI Coach for High-Conflict Custody',
  description:
    'AI coach for parents surviving high-conflict custody and coercive control. Analyze messages, document patterns, prepare for court. $97/month. 7-day free trial. Less than 20 minutes with a family lawyer.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Pattern18',
    statusBarStyle: 'default',
  },
  openGraph: {
    title: 'Pattern18. When their text makes your stomach drop. Your 24/7 AI coach is here.',
    description:
      'AI coach for parents surviving high-conflict custody. Analyze any message, document patterns, prepare for court. $97/month. 7 days free.',
    url: 'https://pattern18.com',
    siteName: 'Pattern18',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pattern18. Your 24/7 AI Coach for High-Conflict Custody',
    description:
      'AI coach for parents surviving high-conflict custody. Analyze any message, document patterns, prepare for court. $97/month. 7 days free.',
  },
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
      </head>
      <body>
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
