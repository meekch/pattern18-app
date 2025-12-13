"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface GlossaryTerm {
  id: string;
  term: string;
  category: string;
  clinical_definition: string;
  common_misuse: string;
  court_interpretation: string;
  say_instead: string;
  why_it_matters: string;
  related_patterns: string[];
  research_sources: string[];
}

export default function GlossaryPage() {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);

  useEffect(() => {
    loadTerms();
  }, []);

  const loadTerms = async () => {
    try {
      const { data, error } = await supabase
        .from("glossary_terms")
        .select("*")
        .eq("is_active", true)
        .order("term", { ascending: true });

      if (data && !error) {
        setTerms(data);
      }
    } catch (err) {
      console.error("Error loading terms:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTerms = terms.filter((term) => {
    return (
      searchQuery === "" ||
      term.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      term.clinical_definition.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading glossary...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Glossary of Terms</h2>
        <p className="text-gray-600">
          Understanding these terms—and how courts interpret them—is essential. Many commonly used 
          words can damage your credibility if misused. Learn what to say instead.
        </p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-lg p-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search terms..."
          className="w-full border rounded-lg p-3"
        />
        <div className="mt-3 text-sm text-gray-500">
          Showing {filteredTerms.length} of {terms.length} terms
        </div>
      </div>

      {/* Terms */}
      <div className="space-y-4">
        {filteredTerms.map((term) => {
          const isExpanded = expandedTerm === term.id;

          return (
            <div key={term.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Header */}
              <button
                onClick={() => setExpandedTerm(isExpanded ? null : term.id)}
                className="w-full p-6 text-left hover:bg-gray-50 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800">{term.term}</h3>
                    <p className="text-gray-600 text-sm mt-1">{term.clinical_definition}</p>
                    {term.category && (
                      <span className="inline-block mt-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {term.category}
                      </span>
                    )}
                  </div>
                  <div className="ml-4 text-gray-400">
                    {isExpanded ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t px-6 pb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {/* Common Misuse */}
                    <div className="bg-orange-50 rounded-lg p-4">
                      <h4 className="font-semibold text-orange-800 mb-2">Common Misuse</h4>
                      <p className="text-sm text-orange-700">{term.common_misuse}</p>
                    </div>

                    {/* Court Interpretation */}
                    <div className="bg-red-50 rounded-lg p-4">
                      <h4 className="font-semibold text-red-800 mb-2">How Courts Interpret It</h4>
                      <p className="text-sm text-red-700">{term.court_interpretation}</p>
                    </div>

                    {/* Say Instead */}
                    <div className="bg-green-50 rounded-lg p-4 md:col-span-2">
                      <h4 className="font-semibold text-green-800 mb-2">Say Instead</h4>
                      <p className="text-sm text-green-700 font-mono">{term.say_instead}</p>
                    </div>

                    {/* Why It Matters */}
                    <div className="bg-blue-50 rounded-lg p-4 md:col-span-2">
                      <h4 className="font-semibold text-blue-800 mb-2">Why It Matters</h4>
                      <p className="text-sm text-blue-700">{term.why_it_matters}</p>
                    </div>
                  </div>

                  {/* Related Patterns */}
                  {term.related_patterns && term.related_patterns.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-gray-500 mb-2">Related Patterns</h4>
                      <div className="flex flex-wrap gap-2">
                        {term.related_patterns.map((pattern, i) => (
                          <span key={i} className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded">
                            {pattern}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Research Sources */}
                  {term.research_sources && term.research_sources.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-gray-500 mb-2">Sources</h4>
                      <div className="flex flex-wrap gap-2">
                        {term.research_sources.map((source, i) => (
                          <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {source}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}