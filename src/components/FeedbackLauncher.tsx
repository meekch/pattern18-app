'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import FeedbackModal from './FeedbackModal';

// Globally mounted floating "Send feedback" launcher.
// Only renders for authenticated users; returns null on public pages.
export default function FeedbackLauncher() {
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setAuthed(!!data.session?.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted) setAuthed(!!session?.user);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Hide on auth/landing-style routes even when authenticated, so the
  // button doesn't overlap login/checkout flows.
  const HIDDEN_ROUTES = ['/login', '/auth', '/callback', '/subscribe', '/thank-you'];
  const isHidden = HIDDEN_ROUTES.some(r => pathname?.startsWith(r));

  if (!authed || isHidden) return null;

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
