"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface ResearchSource {
  id: string;
  author: string;
  title: string;
  source_type: string;
  year: number;
  url: string;
  key_findings: string;
  relevant_patterns: string[];
  citation_text: string;
}

export default function ResearchPage() {
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    try {
      const { data, error } = await supabase
        .from("research_sources")
        .select("*")
        .eq("is_active", true)
        .order("author", { ascending: true });

      if (data && !error) {
        setSources(data);
      }
    } catch (err) {
      console.error("Error loading sources:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const sourceTypeColors: Record<string, string> = {
    book: "bg-blue-100 text-blue-700",
    study: "bg-green-100 text-green-700",
    research: "bg-purple-100 text-purple-700",
    framework: "bg-orange-100 text-orange-700",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading research sources...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Research Sources</h2>
        <p className="text-gray-600">
          Pattern 18 is built on peer-reviewed research and established frameworks from leading 
          experts in coercive control, domestic violence, and family court dynamics. These citations 
          add credibility to your documentation.
        </p>
      </div>

      {/* How to Use */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <h3 className="font-semibold text-green-800 mb-2">Using Research in Your Case</h3>
        <p className="text-green-700 text-sm">
          When presenting pattern evidence, citing research strengthens your credibility. For example: 
          &ldquo;This pattern is consistent with what researcher Evan Stark identifies as coercive control—a 
          pattern of domination rather than isolated incidents.&rdquo; Always verify citations and consider 
          consulting with your attorney about how to incorporate research.
        </p>
      </div>

      {/* Sources */}
      <div className="space-y-4">
        {sources.map((source) => (
          <div key={source.id} className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{source.author}</h3>
                <p className="text-gray-600 italic">{source.title}</p>
              </div>
              <div className="flex items-center gap-2">
                {source.year && (
                  <span className="text-sm text-gray-500">{source.year}</span>
                )}
                <span className={`text-xs font-medium px-2 py-1 rounded ${sourceTypeColors[source.source_type] || "bg-gray-100 text-gray-700"}`}>
                  {source.source_type}
                </span>
              </div>
            </div>

            {source.key_findings && (
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-blue-800 mb-1">Key Findings</h4>
                <p className="text-sm text-blue-700">{source.key_findings}</p>
              </div>
            )}

            {source.citation_text && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-gray-700 mb-1">Citation</h4>
                <p className="text-sm text-gray-600 font-mono">{source.citation_text}</p>
              </div>
            )}

            {source.relevant_patterns && source.relevant_patterns.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-500 mb-2">Relevant Patterns</h4>
                <div className="flex flex-wrap gap-2">
                  {source.relevant_patterns.map((pattern, i) => (
                    <span key={i} className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded">
                      {pattern}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {source.url && (
              <div className="mt-4">
                
                 <a href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 text-sm hover:underline"
                >
                  View Source →
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}