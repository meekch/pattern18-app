"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
  display_order: number;
}

const categories = [
  { value: "all", label: "All Questions" },
  { value: "About", label: "About Pattern 18" },
  { value: "Using Pattern 18", label: "Using the Platform" },
  { value: "Patterns", label: "Patterns & Terms" },
  { value: "Legal", label: "Legal Considerations" },
  { value: "Safety", label: "Safety" },
  { value: "Account", label: "Account & Billing" },
];

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadFaqs();
  }, []);

  const loadFaqs = async () => {
    try {
      const { data, error } = await supabase
        .from("faqs")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (data && !error) {
        setFaqs(data);
      }
    } catch (err) {
      console.error("Error loading FAQs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory = selectedCategory === "all" || faq.category === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Group by category
  const groupedFaqs = filteredFaqs.reduce((acc, faq) => {
    if (!acc[faq.category]) {
      acc[faq.category] = [];
    }
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, FAQ[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading FAQs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Frequently Asked Questions</h2>
        <p className="text-gray-600">
          Find answers to common questions about Pattern 18, documentation strategies, 
          legal considerations, and safety.
        </p>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions..."
              className="w-full border rounded-lg p-3"
            />
          </div>
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full md:w-auto border rounded-lg p-3"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* FAQs by Category */}
      {Object.entries(groupedFaqs).map(([category, categoryFaqs]) => (
        <div key={category} className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-700 px-2">{category}</h3>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden divide-y">
            {categoryFaqs.map((faq) => {
              const isExpanded = expandedFaq === faq.id;
              return (
                <div key={faq.id}>
                  <button
                    onClick={() => setExpandedFaq(isExpanded ? null : faq.id)}
                    className="w-full p-4 text-left hover:bg-gray-50 transition flex items-center justify-between"
                  >
                    <span className="font-medium text-gray-800 pr-4">{faq.question}</span>
                    <span className="text-gray-400 flex-shrink-0">
                      {isExpanded ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-700 whitespace-pre-line">{faq.answer}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filteredFaqs.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <p className="text-gray-500">No questions found matching your search.</p>
        </div>
      )}

      {/* Contact */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-800 mb-2">Still Have Questions?</h3>
        <p className="text-blue-700 text-sm">
          If you could not find the answer you are looking for, reach out to us at{" "}
          <a href="mailto:support@pattern18.com" className="underline">
            support@pattern18.com
          </a>
        </p>
      </div>
    </div>
  );
}