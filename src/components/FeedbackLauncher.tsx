'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import FeedbackModal from './FeedbackModal';

// Globally mounted floating "Send feedback" launcher.
// Shows on every authenticated app surface so Founding Members can give
// feedback in the moment the friction happens. Hidden on marketing/public
// routes so it does not create noise during prospect evaluation.
//
// Mobile placement is critical: the launcher must NOT overlap /coach's chat
// input row, the BottomNav, or the iOS keyboard. We pin it to top-right on
// mobile (well below the header, far from the keyboard area) and bottom-right
// on desktop (no bottom nav to clear).
const HIDDEN_ROUTE_PREFIXES = [
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
];

function isHiddenRoute(pathname: string | null): boolean {
  if (!pathname) return true;
  if (pathname === '/') return true;
  return HIDDEN_ROUTE_PREFIXES.some(
    (r) => pathname === r || pathname.startsWith(r + '/')
  );
}

export default function FeedbackLauncher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (isHiddenRoute(pathname)) return null;

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
        /* DESKTOP (≥768px): bottom-right pill — no BottomNav to clear. */
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

        /* MOBILE (<768px): pin top-right BELOW the in-page header. This
           avoids overlap with the BottomNav (~64px tall, fixed bottom),
           the /coach chat input row (sits just above the nav), and the
           iOS soft keyboard area. Kept small (40px round icon, no label)
           so it's unobtrusive while reading or typing. */
        @media (max-width: 767px) {
          .fb-launcher {
            top: calc(76px + env(safe-area-inset-top));
            right: 12px;
            bottom: auto;
            width: 44px;
            height: 44px;
            padding: 0;
            border-radius: 50%;
            min-height: 44px;
            justify-content: center;
            box-shadow: 0 4px 14px rgba(26, 95, 90, 0.28);
            background: rgba(47, 157, 148, 0.92);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
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
