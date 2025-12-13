"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { name: 'Dashboard', href: '/' },
  { name: 'Calendar', href: '/calendar' },
  { name: 'Incidents', href: '/incidents' },
  { name: 'Communications', href: '/communications' },
  { name: 'Court Orders', href: '/upload' },
  { name: 'Court Docs', href: '/court-docs' },
  { name: 'Case Setup', href: '/case-setup' },
  { name: 'Settings', href: '/settings' },
  { href: "/resources", label: "Resources" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🛡️</span>
              <span className="font-bold text-xl text-gray-800">Pattern 18</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-1">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}