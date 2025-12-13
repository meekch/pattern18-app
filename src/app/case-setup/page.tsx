"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Child {
  id?: string;
  child_name: string;
  child_dob: string;
  school_district: string;
}

interface CaseInfo {
  id?: string;
  case_number: string;
  county: string;
  state: string;
  user_role: "petitioner" | "respondent";
  petitioner_name: string;
  respondent_name: string;
  user_address: string;
  user_city: string;
  user_state: string;
  user_zip: string;
  user_phone: string;
  user_email: string;
  current_schedule: string;
  schedule_start_date: string;
}

const emptyCase: CaseInfo = {
  case_number: "",
  county: "",
  state: "",
  user_role: "respondent",
  petitioner_name: "",
  respondent_name: "",
  user_address: "Protected Address",
  user_city: "",
  user_state: "",
  user_zip: "",
  user_phone: "",
  user_email: "",
  current_schedule: "",
  schedule_start_date: "",
};

const emptyChild: Child = {
  child_name: "",
  child_dob: "",
  school_district: "",
};

export default function CaseSetupPage() {
  const [caseInfo, setCaseInfo] = useState<CaseInfo>(emptyCase);
  const [children, setChildren] = useState<Child[]>([{ ...emptyChild }]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [hasExistingCase, setHasExistingCase] = useState(false);

  useEffect(() => {
    loadExistingCase();
  }, []);

  const loadExistingCase = async () => {
    try {
      const { data: caseData, error: caseError } = await supabase
        .from("user_cases")
        .select("*")
        .eq("is_active", true)
        .limit(1)
        .single();

      if (caseData && !caseError) {
        setCaseInfo({
          id: caseData.id,
          case_number: caseData.case_number || "",
          county: caseData.county || "",
          state: caseData.state || "",
          user_role: caseData.user_role || "respondent",
          petitioner_name: caseData.petitioner_name || "",
          respondent_name: caseData.respondent_name || "",
          user_address: caseData.respondent_address || "Protected Address",
          user_city: caseData.respondent_city || "",
          user_state: caseData.respondent_state || "",
          user_zip: caseData.respondent_zip || "",
          user_phone: caseData.respondent_phone || "",
          user_email: caseData.respondent_email || "",
          current_schedule: caseData.current_schedule || "",
          schedule_start_date: caseData.schedule_start_date || "",
        });
        setHasExistingCase(true);

        // Load children
        const { data: childrenData } = await supabase
          .from("case_children")
          .select("*")
          .eq("case_id", caseData.id)
          .order("created_at", { ascending: true });

        if (childrenData && childrenData.length > 0) {
          setChildren(
            childrenData.map((c) => ({
              id: c.id,
              child_name: c.child_name || "",
              child_dob: c.child_dob || "",
              school_district: c.school_district || "",
            }))
          );
        }
      }
    } catch (err) {
      // No existing case
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      // Validate
      if (!caseInfo.case_number || !caseInfo.petitioner_name || !caseInfo.respondent_name) {
        setMessage({ type: "error", text: "Please fill in case number and both parent names." });
        setIsSaving(false);
        return;
      }

      const validChildren = children.filter((c) => c.child_name.trim());
      if (validChildren.length === 0) {
        setMessage({ type: "error", text: "Please add at least one child." });
        setIsSaving(false);
        return;
      }

      let caseId = caseInfo.id;

      if (caseId) {
        // Update existing case
        const { error } = await supabase
          .from("user_cases")
          .update({
            case_number: caseInfo.case_number,
            county: caseInfo.county,
            state: caseInfo.state,
            user_role: caseInfo.user_role,
            petitioner_name: caseInfo.petitioner_name,
            respondent_name: caseInfo.respondent_name,
            respondent_address: caseInfo.user_address,
            respondent_city: caseInfo.user_city,
            respondent_state: caseInfo.user_state,
            respondent_zip: caseInfo.user_zip,
            respondent_phone: caseInfo.user_phone,
            respondent_email: caseInfo.user_email,
            child_name: validChildren[0]?.child_name || "",
            current_schedule: caseInfo.current_schedule,
            schedule_start_date: caseInfo.schedule_start_date || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", caseId);

        if (error) throw error;
      } else {
        // Create new case
        const { data, error } = await supabase
          .from("user_cases")
          .insert({
            case_number: caseInfo.case_number,
            county: caseInfo.county,
            state: caseInfo.state,
            user_role: caseInfo.user_role,
            petitioner_name: caseInfo.petitioner_name,
            respondent_name: caseInfo.respondent_name,
            respondent_address: caseInfo.user_address,
            respondent_city: caseInfo.user_city,
            respondent_state: caseInfo.user_state,
            respondent_zip: caseInfo.user_zip,
            respondent_phone: caseInfo.user_phone,
            respondent_email: caseInfo.user_email,
            child_name: validChildren[0]?.child_name || "",
            current_schedule: caseInfo.current_schedule,
            schedule_start_date: caseInfo.schedule_start_date || null,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;
        caseId = data.id;
        setCaseInfo({ ...caseInfo, id: caseId });
        setHasExistingCase(true);
      }

      // Save children - delete existing and re-insert
      await supabase.from("case_children").delete().eq("case_id", caseId);

      const childrenToInsert = validChildren.map((c) => ({
        case_id: caseId,
        child_name: c.child_name,
        child_dob: c.child_dob || null,
        school_district: c.school_district || null,
      }));

      if (childrenToInsert.length > 0) {
        const { error: childError } = await supabase.from("case_children").insert(childrenToInsert);
        if (childError) throw childError;
      }

      setMessage({ type: "success", text: "Case information saved! This will auto-fill into all your court documents." });
    } catch (err) {
      console.error("Save error:", err);
      setMessage({ type: "error", text: "Failed to save. Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  const addChild = () => {
    setChildren([...children, { ...emptyChild }]);
  };

  const removeChild = (index: number) => {
    if (children.length > 1) {
      setChildren(children.filter((_, i) => i !== index));
    }
  };

  const updateChild = (index: number, field: keyof Child, value: string) => {
    const updated = [...children];
    updated[index] = { ...updated[index], [field]: value };
    setChildren(updated);
  };

  // Helper to get the right label based on role
  const getUserName = () => (caseInfo.user_role === "petitioner" ? caseInfo.petitioner_name : caseInfo.respondent_name);
  const getOtherParentName = () => (caseInfo.user_role === "petitioner" ? caseInfo.respondent_name : caseInfo.petitioner_name);

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

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === "success" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
            <p className={message.type === "success" ? "text-green-700" : "text-red-700"}>{message.text}</p>
            
            {message.type === "success" && (
              <div className="mt-4 pt-4 border-t border-green-200">
                <p className="text-green-800 font-medium mb-3">What would you like to do next?</p>
                <div className="flex flex-wrap gap-3">
                  <a href="/court-docs" className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                    Generate Court Document
                  </a>
                  <a href="/incidents" className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition">
                    Log an Incident
                  </a>
                  <a href="/communications" className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition">
                    Log Communication
                  </a>
                  <a href="/" className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition">
                    Dashboard
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-6">
          {/* Case Details */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Case Details</h2>
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

          {/* Your Role */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Role in the Case</h2>
            <p className="text-sm text-gray-500 mb-4">Are you the Petitioner (filed the case) or Respondent (responded to the case)?</p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setCaseInfo({ ...caseInfo, user_role: "petitioner" })}
                className={`flex-1 p-4 rounded-lg border-2 transition ${
                  caseInfo.user_role === "petitioner"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-semibold">Petitioner</div>
                <div className="text-sm text-gray-500">I filed the original case</div>
              </button>
              <button
                type="button"
                onClick={() => setCaseInfo({ ...caseInfo, user_role: "respondent" })}
                className={`flex-1 p-4 rounded-lg border-2 transition ${
                  caseInfo.user_role === "respondent"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-semibold">Respondent</div>
                <div className="text-sm text-gray-500">I am responding to the case</div>
              </button>
            </div>
          </div>

          {/* Parties */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Parties</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Petitioner Name <span className="text-red-500">*</span>
                  {caseInfo.user_role === "petitioner" && (
                    <span className="ml-2 text-blue-600 text-xs">(You)</span>
                  )}
                </label>
                <input
                  type="text"
                  value={caseInfo.petitioner_name}
                  onChange={(e) => setCaseInfo({ ...caseInfo, petitioner_name: e.target.value })}
                  className="w-full border rounded-lg p-3"
                  placeholder="Full legal name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Respondent Name <span className="text-red-500">*</span>
                  {caseInfo.user_role === "respondent" && (
                    <span className="ml-2 text-blue-600 text-xs">(You)</span>
                  )}
                </label>
                <input
                  type="text"
                  value={caseInfo.respondent_name}
                  onChange={(e) => setCaseInfo({ ...caseInfo, respondent_name: e.target.value })}
                  className="w-full border rounded-lg p-3"
                  placeholder="Full legal name"
                />
              </div>
            </div>
          </div>

          {/* Your Contact Info */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Contact Information</h2>
            <p className="text-sm text-gray-500 mb-4">This appears on court documents you file.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={caseInfo.user_address}
                  onChange={(e) => setCaseInfo({ ...caseInfo, user_address: e.target.value })}
                  className="w-full border rounded-lg p-3"
                  placeholder="Street address or 'Protected Address'"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={caseInfo.user_city}
                  onChange={(e) => setCaseInfo({ ...caseInfo, user_city: e.target.value })}
                  className="w-full border rounded-lg p-3"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={caseInfo.user_state}
                    onChange={(e) => setCaseInfo({ ...caseInfo, user_state: e.target.value })}
                    className="w-full border rounded-lg p-3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zip</label>
                  <input
                    type="text"
                    value={caseInfo.user_zip}
                    onChange={(e) => setCaseInfo({ ...caseInfo, user_zip: e.target.value })}
                    className="w-full border rounded-lg p-3"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={caseInfo.user_phone}
                  onChange={(e) => setCaseInfo({ ...caseInfo, user_phone: e.target.value })}
                  className="w-full border rounded-lg p-3"
                  placeholder="e.g., 602-555-1234"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={caseInfo.user_email}
                  onChange={(e) => setCaseInfo({ ...caseInfo, user_email: e.target.value })}
                  className="w-full border rounded-lg p-3"
                  placeholder="your@email.com"
                />
              </div>
            </div>
          </div>

          {/* Children */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Children</h2>
              <button
                type="button"
                onClick={addChild}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                + Add Child
              </button>
            </div>
            
            <div className="space-y-4">
              {children.map((child, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-gray-700">Child {index + 1}</span>
                    {children.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeChild(index)}
                        className="text-red-500 hover:text-red-600 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={child.child_name}
                        onChange={(e) => updateChild(index, "child_name", e.target.value)}
                        className="w-full border rounded-lg p-3"
                        placeholder="First name only"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={child.child_dob}
                        onChange={(e) => updateChild(index, "child_dob", e.target.value)}
                        className="w-full border rounded-lg p-3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">School District</label>
                      <input
                        type="text"
                        value={child.school_district}
                        onChange={(e) => updateChild(index, "school_district", e.target.value)}
                        className="w-full border rounded-lg p-3"
                        placeholder="e.g., Chandler USD"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Current Schedule */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Current Schedule</h2>
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

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {isSaving ? "Saving..." : hasExistingCase ? "Update Case Information" : "Save Case Information"}
          </button>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="font-semibold text-blue-800 mb-2">How This Helps You</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>Auto-fills into every court document you generate</li>
              <li>No need to re-enter case number, names, etc. each time</li>
              <li>Ensures consistency across all your filings</li>
              <li>Update once, changes apply everywhere</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}