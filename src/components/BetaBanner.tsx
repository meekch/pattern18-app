'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import FeedbackForm from './FeedbackForm';

// Top-of-page beta banner shown on authenticated app routes only.
// Tapping the banner opens the FeedbackForm (same component the Menu uses).
// Persistently dismissible via localStorage. Globally killable via the
// BETA_BANNER_ENABLED env var, which is read server-side in app/layout.tsx
// and passed in as `enabled`.

interface BetaBannerProps {
  enabled: boolean;
}

const DISMISS_KEY = 'pattern18_beta_banner_dismissed';

const HIDDEN_PREFIXES = [
  '/founding',
  '/pricing',
  '/faq',
  '/sign-in',
  '/sign-up',
  '/login',
  '/auth',
  '/callback',
  '/subscribe',
  '/thank-you',
  '/demo',
  '/admin',
];

function isHiddenRoute(pathname: string | null): boolean {
  if (!pathname) return true;
  if (pathname === '/') return true;
  return HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export default function BetaBanner({ enabled }: BetaBannerProps) {
  const pathname = usePathname();
  // Tri-state initial render: null = unresolved (returns null) so SSR
  // doesn't show then immediately hide for already-dismissed users.
  const [shouldShow, setShouldShow] = useState<boolean | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setShouldShow(false);
      return;
    }
    try {
      const dismissed = window.localStorage.getItem(DISMISS_KEY) === 'true';
      setShouldShow(!dismissed);
    } catch {
      // localStorage may be blocked (private mode, etc.); show by default.
      setShouldShow(true);
    }
  }, [enabled]);

  const onDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      window.localStorage.setItem(DISMISS_KEY, 'true');
    } catch {}
    setShouldShow(false);
  };

  if (!enabled) return null;
  if (shouldShow !== true) return null;
  if (isHiddenRoute(pathname)) return null;

  return (
    <>
      <button
        type="button"
        className="beta-banner"
        onClick={() => setShowForm(true)}
        aria-label="Open feedback form"
      >
        <span className="beta-text-mobile">
          Pattern18 is in beta, tell Rae what&rsquo;s broken or what you wish for &rarr;
        </span>
        <span className="beta-text-desktop">
          Pattern18 is in beta. We&rsquo;re building this with you. Send feedback &rarr;
        </span>
        <span
          className="beta-close"
          role="button"
          tabIndex={0}
          aria-label="Dismiss banner"
          onClick={onDismiss}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onDismiss(e as unknown as React.MouseEvent);
          }}
        >
          ✕
        </span>
      </button>

      <FeedbackForm open={showForm} onClose={() => setShowForm(false)} />

      <style jsx>{`
        .beta-banner {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 10px 16px;
          background: #F4EFE6;
          color: #1F2937;
          border: none;
          border-bottom: 1px solid #E1D9C9;
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          line-height: 1.4;
          cursor: pointer;
          text-align: center;
          position: relative;
          min-height: 36px;
          transition: background 0.15s;
        }
        .beta-banner:hover {
          background: #EDE6D8;
        }
        .beta-banner:focus-visible {
          outline: 2px solid #2F9D94;
          outline-offset: -2px;
        }

        .beta-text-mobile {
          display: inline;
          padding-right: 32px;
        }
        .beta-text-desktop {
          display: none;
        }

        .beta-close {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #9c8e76;
          font-size: 14px;
          line-height: 1;
          border-radius: 14px;
          cursor: pointer;
          transition: color 0.15s, background 0.15s;
        }
        .beta-close:hover {
          color: #1F2937;
          background: rgba(31, 41, 55, 0.06);
        }
        .beta-close:focus-visible {
          outline: 2px solid #2F9D94;
        }

        @media (min-width: 768px) {
          .beta-banner {
            padding: 10px 16px;
            font-size: 14px;
            min-height: 40px;
          }
          .beta-text-mobile {
            display: none;
          }
          .beta-text-desktop {
            display: inline;
            padding-right: 32px;
          }
        }
      `}</style>
    </>
  );
}
