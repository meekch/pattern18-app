"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface CaseInfo {
  id?: string;
  case_number: string;
  county: string;
  state: string;
  petitioner_name: string;
  respondent_name: string;
  respondent_address: string;
  respondent_city: string;
  respondent_state: string;
  respondent_zip: string;
  respondent_phone: string;
  respondent_email: string;
  child_name: string;
  child_dob: string;
  school_district: string;
  current_schedule: string;
  schedule_start_date: string;
}

const emptyCase: CaseInfo = {
  case_number: "",
  county: "",
  state: "",
  petitioner_name: "",
  respondent_name: "",
  respondent_address: "Protected Address",
  respondent_city: "",
  respondent_state: "",
  respondent_zip: "",
  respondent_phone: "",
  respondent_email: "",
  child_name: "",
  child_dob: "",
  school_district: "",
  current_schedule: "",
  schedule_start_date: "",
};

export default function CaseSetupPage() {
  const [caseInfo, setCaseInfo] = useState<CaseInfo>(emptyCase);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [hasExistingCase, setHasExistingCase] = useState(false);

  useEffect(() => {
    loadExistingCase();
  }, []);

  const loadExistingCase = async () => {
    try {
      const { data, error } = await supabase
        .from("user_cases")
        .select("*")
        .eq("is_active", true)
        .limit(1)
        .single();

      if (data && !error) {
        setCaseInfo({
          id: data.id,
          case_number: data.case_number || "",
          county: data.county || "",
          state: data.state || "",
          petitioner_name: data.petitioner_name || "",
          respondent_name: data.respondent_name || "",
          respondent_address: data.respondent_address || "Protected Address",
          respondent_city: data.respondent_city || "",
          respondent_state: data.respondent_state || "",
          respondent_zip: data.respondent_zip || "",
          respondent_phone: data.respondent_phone || "",
          respondent_email: data.respondent_email || "",
          child_name: data.child_name || "",
          child_dob: data.child_dob || "",
          school_district: data.school_district || "",
          current_schedule: data.current_schedule || "",
          schedule_start_date: data.schedule_start_date || "",
        });
        setHasExistingCase(true);
      }
    } catch (err) {
      // No existing case, that's fine
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      if (!caseInfo.case_number || !caseInfo.petitioner_name || !caseInfo.respondent_name || !caseInfo.child_name) {
        setMessage({ type: "error", text: "Please fill in all required fields (case number, both parents' names, child's name)" });
        setIsSaving(false);
        return;
      }

      if (caseInfo.id) {
        const { error } = await supabase
          .from("user_cases")
          .update({
            ...caseInfo,
            updated_at: new Date().toISOString(),
          })
          .eq("id", caseInfo.id);

        if (error) throw error;
        setMessage({ type: "success", text: "Case information updated!" });
      } else {
        const { data, error } = await supabase
          .from("user_cases")
          .insert({
            ...caseInfo,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;
        setCaseInfo({ ...caseInfo, id: data.id });
        setHasExistingCase(true);
        setMessage({ type: "success", text: "Case information saved! This will auto-fill into all your court documents." });
      }
    } catch (err) {
      console.error("Save error:", err);
      setMessage({ type: "error", text: "Failed to save. Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📋</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Case Setup</h1>
              <p className="text-gray-600">
                Enter your case information once. It will auto-fill into all court documents.
              </p>
            </div>
          </div>
          {hasExistingCase && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span className="text-green-700 text-sm">Case information saved. Update anytime below.</span>
            </div>
          )}
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
            {message.text}
          </div>
        )}

        {/* Form */}
        <div className="space-y-6">
          {/* Case Details */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">⚖️ Case Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Case Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={caseInfo.case_number}
                  onChange={(e) => setCaseInfo({ ...caseInfo, case_number: e.target.value })}
                  className="w-full border rounded-lg p-3"
                  placeholder="e.g., FC2010-005886"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  County <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={caseInfo.county}
                  onChange={(e) => setCaseInfo({ ...caseInfo, county: e.target.value })}
                  className="w-full border rounded-lg p-3"
                  placeholder="e.g., Maricopa"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={caseInfo.state}
                  onChange={(e) => setCaseInfo({ ...caseInfo, state: e.target.value })}
                  className="w-full border rounded-lg p-3"
                  placeholder="e.g., Arizona"
                />
              </div>
            </div>
          </div>

          {/* Parties */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">👥 Parties</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Other Parent (Petitioner) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={caseInfo.petitioner_name}
                  onChange={(e) => setCaseInfo({ ...caseInfo, petitioner_name: e.target.value })}
                  className="w-full border rounded-lg p-3"
                  placeholder="Their full legal name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name (Respondent) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={caseInfo.respondent_name}
                  onChange={(e) => setCaseInfo({ ...caseInfo, respondent_name: e.target.value })}
                  className="w-full border rounded-lg p-3"
                  placeholder="Your full legal name"
                />
              </div>
            </div>
          </div>

          {/* Your Contact Info */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">📍 Your Contact Information</h2>
            <p className="text-sm text-gray-500 mb-4">This appears on court documents you file.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={caseInfo.respondent_address}
                  onChange={(e) => setCaseInfo({ ...caseInfo, respondent_address: e.target.value })}
                  className="w-full border rounded-lg p-3"
                  placeholder="Street address or 'Protected Address'"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={caseInfo.respondent_city}
                  onChange={(e) => setCaseInfo({ ...caseInfo, respondent_city: e.target.value })}
                  className="w-full border rounded-lg p-3"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={caseInfo.respondent_state}
                    onChange={(e) => setCaseInfo({ ...caseInfo, respondent_state: e.target.value })}
                    className="w-full border rounded-lg p-3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zip</label>
                  <input
                    type="text"
                    value={caseInfo.respondent_zip}
                    onChange={(e) => setCaseInfo({ ...caseInfo, respondent_zip: e.target.value })}
                    className="w-full border rounded-lg p-3"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={caseInfo.respondent_phone}
                  onChange={(e) => setCaseInfo({ ...caseInfo, respondent_phone: e.target.value })}
                  className="w-full border rounded-lg p-3"
                  placeholder="e.g., 602-555-1234"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={caseInfo.respondent_email}
                  onChange={(e) => setCaseInfo({ ...caseInfo, respondent_email: e.target.value })}
                  className="w-full border rounded-lg p-3"
                  placeholder="your@email.com"
                />
              </div>
            </div>
          </div>

          {/* Child Info */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">👶 Child Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Child&apos;s First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={caseInfo.child_name}
                  onChange={(e) => setCaseInfo({ ...caseInfo, child_name: e.target.value })}
                  className="w-full border rounded-lg p-3"
                  placeholder="First name only (for privacy)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={caseInfo.child_dob}
                  onChange={(e) => setCaseInfo({ ...caseInfo, child_dob: e.target.value })}
                  className="w-full border rounded-lg p-3"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">School District</label>
                <input
                  type="text"
                  value={caseInfo.school_district}
                  onChange={(e) => setCaseInfo({ ...caseInfo, school_district: e.target.value })}
                  className="w-full border rounded-lg p-3"
                  placeholder="e.g., Chandler Unified School District"
                />
              </div>
            </div>
          </div>

          {/* Current Schedule */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">📅 Current Schedule</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Parenting Schedule</label>
                <input
                  type="text"
                  value={caseInfo.current_schedule}
                  onChange={(e) => setCaseInfo({ ...caseInfo, current_schedule: e.target.value })}
                  className="w-full border rounded-lg p-3"
                  placeholder="e.g., Week on week off with Friday exchanges"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Start Date</label>
                <input
                  type="date"
                  value={caseInfo.schedule_start_date}
                  onChange={(e) => setCaseInfo({ ...caseInfo, schedule_start_date: e.target.value })}
                  className="w-full border rounded-lg p-3"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {isSaving ? "Saving..." : hasExistingCase ? "💾 Update Case Information" : "💾 Save Case Information"}
          </button>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="font-semibold text-blue-800 mb-2">💡 How This Helps You</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>✓ Auto-fills into every court document you generate</li>
              <li>✓ No need to re-enter case number, names, etc. each time</li>
              <li>✓ Ensures consistency across all your filings</li>
              <li>✓ Update once, changes apply everywhere</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}