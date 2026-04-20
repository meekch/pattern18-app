'use client';

import { useState } from 'react';
import Link from 'next/link';
import { STRIPE_MONTHLY_URL } from '@/lib/stripe-links';

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <nav className="site-nav">
      <div className="site-nav-inner">
        <Link href="/" className="site-brand" onClick={close}>
          <span className="site-brand-badge">18</span>
          <span className="site-brand-name">Pattern18</span>
        </Link>

        {/* Desktop links. Hidden below 768px. */}
        <div className="site-nav-desktop">
          <Link href="/faq" className="site-nav-link">FAQ</Link>
          <Link href="/pricing" className="site-nav-link">Pricing</Link>
          <Link href="/login" className="site-nav-link">Sign in</Link>
          <a href={STRIPE_MONTHLY_URL} className="site-nav-cta">Start Free Trial</a>
        </div>

        {/* Hamburger. Hidden above 768px. */}
        <button
          type="button"
          className="site-nav-hamburger"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="site-nav-mobile-panel"
        >
          {open ? (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {open && (
        <div id="site-nav-mobile-panel" className="site-nav-mobile-panel">
          <Link href="/faq" className="site-nav-mobile-link" onClick={close}>FAQ</Link>
          <Link href="/pricing" className="site-nav-mobile-link" onClick={close}>Pricing</Link>
          <Link href="/login" className="site-nav-mobile-link" onClick={close}>Sign in</Link>
          <div className="site-nav-mobile-divider" />
          <a
            href={STRIPE_MONTHLY_URL}
            className="site-nav-mobile-cta"
            onClick={close}
          >
            Start 7-Day Free Trial
          </a>
        </div>
      )}
    </nav>
  );
}
