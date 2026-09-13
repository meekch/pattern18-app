'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const SAFE_URL = 'https://www.google.com';

// Marketing / pre-auth surfaces. Everything else is treated as an
// authenticated app surface and gets the control. Defaulting to "show" is
// deliberate: for a safety control, a stray button on a public page is a far
// cheaper mistake than a missing one behind the login.
const PUBLIC_PREFIXES = [
  '/faq',
  '/pricing',
  '/login',
  '/founding',
  '/thank-you',
  '/resources',
  '/auth',
];

function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function leave() {
  // replace() overwrites the current history entry, so Back does not land
  // back on Pattern18.
  window.location.replace(SAFE_URL);
}

export default function QuickExit() {
  const pathname = usePathname();
  const hidden = isPublicPath(pathname || '/');

  useEffect(() => {
    if (hidden) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;

      const el = document.activeElement as HTMLElement | null;
      if (el) {
        const tag = el.tagName;
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          el.isContentEditable
        ) {
          return;
        }
      }

      e.preventDefault();
      leave();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hidden]);

  if (hidden) return null;

  return (
    <>
      <button
        type="button"
        className="quick-exit"
        onClick={leave}
        aria-label="Quick exit"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <style jsx>{`
        .quick-exit {
          position: fixed;
          top: calc(env(safe-area-inset-top, 0px) + 10px);
          right: calc(env(safe-area-inset-right, 0px) + 10px);
          z-index: 2147483647;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: 1px solid #C7E4E0;
          border-radius: 50%;
          background: #FAFAF7;
          color: #1A5F5A;
          box-shadow: 0 2px 8px rgba(31, 41, 55, 0.16);
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }

        .quick-exit:hover {
          background: #EAF5F3;
        }

        .quick-exit:active {
          transform: scale(0.94);
        }

        .quick-exit:focus-visible {
          outline: 2px solid #2F9D94;
          outline-offset: 2px;
        }
      `}</style>
    </>
  );
}
