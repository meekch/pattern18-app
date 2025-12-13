import Link from "next/link";

const sections = [
  {
    href: "/resources/patterns",
    icon: "🔍",
    title: "Pattern Library",
    description: "18+ research-identified patterns of coercive control with definitions, documentation guidance, and court-safe language.",
    count: "18 patterns",
  },
  {
    href: "/resources/glossary",
    icon: "📖",
    title: "Glossary of Terms",
    description: "Mental health and legal terminology with clinical definitions, how courts interpret them, and what to say instead.",
    count: "12 terms",
  },
  {
    href: "/resources/language",
    icon: "⚖️",
    title: "Court Language Guide",
    description: "What to say vs. what NOT to say in court. Transform emotional language into credible, documentable statements.",
    count: "16 examples",
  },
  {
    href: "/resources/research",
    icon: "🎓",
    title: "Research Sources",
    description: "Expert citations from Evan Stark, Joan Meier, Lundy Bancroft, and other leading researchers in coercive control.",
    count: "12 sources",
  },
  {
    href: "/resources/faq",
    icon: "❓",
    title: "FAQ",
    description: "Frequently asked questions about Pattern 18, documentation strategies, legal considerations, and safety.",
    count: "20+ questions",
  },
];

export default function ResourcesPage() {
  return (
    <div className="space-y-8">
      {/* Intro */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Evidence-Based Framework for Recognizing Coercive Control
        </h2>
        <p className="text-gray-600 mb-4">
          Pattern 18 is built on research from leading experts in domestic violence, coercive control, 
          and family court dynamics. This resource library provides the knowledge foundation for 
          recognizing, documenting, and presenting patterns that courts often miss.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">Why Pattern Recognition Matters</h3>
          <p className="text-sm text-blue-700">
            Courts traditionally assess abuse through isolated incidents. But coercive control operates 
            through <strong>patterns</strong>—systematic behaviors that individually seem minor but 
            collectively constitute abuse. Recognizing and documenting these patterns is essential for 
            courts to see what they typically miss.
          </p>
        </div>
      </div>

      {/* Section Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition group"
          >
            <div className="text-4xl mb-4">{section.icon}</div>
            <h3 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition">
              {section.title}
            </h3>
            <p className="text-gray-600 text-sm mt-2 mb-4">{section.description}</p>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
              {section.count}
            </span>
          </Link>
        ))}
      </div>

      {/* Key Researchers */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Research Foundation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800">Evan Stark</h3>
            <p className="text-sm text-gray-600">Coercive Control framework</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800">Joan Meier</h3>
            <p className="text-sm text-gray-600">Family court outcomes research</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800">Lundy Bancroft</h3>
            <p className="text-sm text-gray-600">Abuser tactics and behavior</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800">Duluth Model</h3>
            <p className="text-sm text-gray-600">Post-separation abuse wheel</p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <h3 className="font-semibold text-yellow-800 mb-2">Important Notice</h3>
        <p className="text-sm text-yellow-700">
          Pattern 18 is an organizational tool, not a law firm. This information is educational and 
          does not constitute legal advice. Always consult with a licensed attorney in your jurisdiction 
          before making legal decisions. The pattern framework helps you organize and recognize behaviors 
          but court strategy should be developed with professional legal guidance.
        </p>
      </div>
    </div>
  );
}