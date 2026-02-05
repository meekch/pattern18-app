"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const resourceNav = [
  { href: "/resources", label: "Overview", icon: "📚" },
  { href: "/resources/patterns", label: "Patterns", icon: "🔍" },
  { href: "/resources/glossary", label: "Glossary", icon: "📖" },
  { href: "/resources/language", label: "Court Language", icon: "⚖️" },
  { href: "/resources/research", label: "Research", icon: "🎓" },
];

export default function ResourcesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-800">Resource Library</h1>
          <p className="text-gray-600 mt-1">
            Research-backed patterns, terms, and guidance for documenting coercive control
          </p>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4">
          <nav className="flex gap-1 overflow-x-auto">
            {resourceNav.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                    isActive
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">{children}</div>
    </div>
  );
}