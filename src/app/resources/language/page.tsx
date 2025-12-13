"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface CourtLanguage {
  id: string;
  category: string;
  dont_say: string;
  say_instead: string;
  why: string;
  example_context: string;
}

const categories = [
  { value: "all", label: "All Categories" },
  { value: "Labels", label: "Labels" },
  { value: "Emotional Language", label: "Emotional Language" },
  { value: "Accusations", label: "Accusations" },
  { value: "Intentions", label: "Intentions" },
  { value: "Slang Terms", label: "Slang Terms" },
  { value: "Tone", label: "Tone" },
];

export default function LanguagePage() {
  const [items, setItems] = useState<CourtLanguage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const { data, error } = await supabase
        .from("court_language")
        .select("*")
        .eq("is_active", true)
        .order("category", { ascending: true });

      if (data && !error) {
        setItems(data);
      }
    } catch (err) {
      console.error("Error loading court language:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    return selectedCategory === "all" || item.category === selectedCategory;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Court Language Guide</h2>
        <p className="text-gray-600">
          The words you use in court documents and testimony matter. Transform emotional accusations 
          into credible, documentable statements that judges will take seriously.
        </p>
      </div>

      {/* Key Principle */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-800 mb-2">The Core Principle</h3>
        <p className="text-blue-700">
          <strong>Show, do not tell.</strong> Instead of labeling behavior (he is a narcissist), describe 
          specific actions with dates and evidence (on [date], he stated [X] despite [Y] evidence showing 
          otherwise). Let the court draw conclusions from the facts you present.
        </p>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-lg p-4">
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
        <span className="ml-4 text-sm text-gray-500">
          Showing {filteredItems.length} examples
        </span>
      </div>

      {/* Language Examples */}
      <div className="space-y-4">
        {filteredItems.map((item) => (
          <div key={item.id} className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded">
                {item.category}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Don't Say */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-red-500 font-bold">✗</span>
                  <h4 className="font-semibold text-red-800">Do Not Say</h4>
                </div>
                <p className="text-red-700 italic">&ldquo;{item.dont_say}&rdquo;</p>
              </div>

              {/* Say Instead */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <h4 className="font-semibold text-green-800">Say Instead</h4>
                </div>
                <p className="text-green-700">&ldquo;{item.say_instead}&rdquo;</p>
              </div>
            </div>

            {/* Why */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-700 mb-1">Why This Matters</h4>
              <p className="text-sm text-gray-600">{item.why}</p>
            </div>

            {/* Context */}
            {item.example_context && item.example_context !== "N/A - don\'t reference in court documents" && (
              <div className="mt-3 text-sm text-gray-500">
                <span className="font-medium">When to use:</span> {item.example_context}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}