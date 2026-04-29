'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import FeedbackModal from './FeedbackModal';

// Marketing-only floating "Send feedback" launcher.
// Renders ONLY on public/marketing routes. Suppressed on every authenticated
// app surface so it can't overlap the chat input on /coach or any other
// in-app interaction. Logged-in members give feedback via Skool, the weekly
// check-in form, or by replying to onboarding email.
const MARKETING_ROUTES = [
  '/',
  '/founding',
  '/pricing',
  '/faq',
  '/sign-in',
  '/login',
];

function isMarketingRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === '/') return true;
  return MARKETING_ROUTES.some(
    (r) => r !== '/' && (pathname === r || pathname.startsWith(r + '/'))
  );
}

export default function FeedbackLauncher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (!isMarketingRoute(pathname)) return null;

  return (
    <>
      <button
        type="button"
        className="fb-launcher"
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
      >
        <span className="fb-icon" aria-hidden="true">💬</span>
        <span className="fb-text">Feedback</span>
      </button>

      {open && (
        <FeedbackModal
          pathname={pathname ?? null}
          onClose={() => setOpen(false)}
        />
      )}

      <style jsx>{`
        .fb-launcher {
          position: fixed;
          right: 16px;
          bottom: calc(16px + env(safe-area-inset-bottom));
          z-index: 9000;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #2F9D94;
          color: #FAFAF7;
          border: none;
          border-radius: 999px;
          padding: 12px 18px;
          font-size: 14px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(26, 95, 90, 0.32);
          min-height: 44px;
          transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
        }
        .fb-launcher:hover {
          background: #1A5F5A;
          box-shadow: 0 10px 28px rgba(26, 95, 90, 0.4);
        }
        .fb-launcher:active {
          transform: translateY(1px);
        }
        .fb-icon {
          font-size: 16px;
          line-height: 1;
        }
        @media (max-width: 480px) {
          .fb-launcher {
            padding: 12px 14px;
          }
          .fb-text {
            display: none;
          }
          .fb-icon {
            font-size: 20px;
          }
        }
      `}</style>
    </>
  );
}
