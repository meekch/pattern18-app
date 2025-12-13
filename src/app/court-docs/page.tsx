"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const LEGAL_DISCLAIMER = `IMPORTANT LEGAL NOTICE

Pattern 18 Coach is an ORGANIZATIONAL TOOL, not a law firm.

- We do NOT provide legal advice
- We are NOT a substitute for an attorney
- Documents generated are STARTING POINTS for you to customize

Before filing anything with a court:
- Review and verify all content for accuracy
- Check your local court rules and formatting requirements
- Consider consulting with a licensed attorney`;

interface Child {
  child_name: string;
  child_dob?: string;
  school_district?: string;
}

interface CaseData {
  id: string;
  caseNumber: string;
  county: string;
  state: string;
  userRole: "petitioner" | "respondent";
  petitionerName: string;
  respondentName: string;
  userAddress: string;
  userCity: string;
  userState: string;
  userZip: string;
  userPhone: string;
  userEmail: string;
  children: Child[];
}

interface MotionClaim {
  id: number;
  claim: string;
  responseType: "admit" | "deny" | "partial" | "";
  response: string;
  evidence: string;
}

interface ExistingDocument {
  id: string;
  title: string;
  filing_date: string;
  filed_by: string;
  parsed_content: any;
  summary: string;
}

export default function CourtDocsPage() {
  const [step, setStep] = useState<"disclaimer" | "select" | "upload-motion" | "analyze" | "respond" | "review" | "generate">("disclaimer");
  const [documentType, setDocumentType] = useState<string>("");
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [caseLoaded, setCaseLoaded] = useState(false);

  const [caseData, setCaseData] = useState<CaseData | null>(null);

  // Motion source options
  const [motionSource, setMotionSource] = useState<"existing" | "upload" | "paste" | "">("");
  const [existingMotions, setExistingMotions] = useState<ExistingDocument[]>([]);
  const [selectedMotionId, setSelectedMotionId] = useState<string | null>(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Motion analysis state
  const [motionText, setMotionText] = useState("");
  const [motionTitle, setMotionTitle] = useState("");
  const [motionDate, setMotionDate] = useState("");
  const [motionClaims, setMotionClaims] = useState<MotionClaim[]>([]);
  const [reliefTheyWant, setReliefTheyWant] = useState<string[]>([]);
  const [reliefYouWant, setReliefYouWant] = useState<string[]>([""]);

  // Tone warnings
  const [toneWarnings, setToneWarnings] = useState<string[]>([]);

  // Contempt data
  const [contemptData, setContemptData] = useState({
    courtOrderDate: "",
    courtOrderProvisions: [""],
    violations: [{ title: "", date: "", provisionViolated: "", expected: "", actual: "", evidence: "", childImpact: "" }],
    reliefRequested: [""],
  });

  useEffect(() => {
    loadCaseInfo();
  }, []);

  // Load existing motions when "existing" is selected
  useEffect(() => {
    if (motionSource === "existing" && caseData?.id) {
      loadExistingMotions();
    }
  }, [motionSource, caseData?.id]);

  const loadCaseInfo = async () => {
    try {
      const { data: caseRecord, error: caseError } = await supabase
        .from("user_cases")
        .select("*")
        .eq("is_active", true)
        .limit(1)
        .single();

      if (caseRecord && !caseError) {
        const { data: childrenData } = await supabase
          .from("case_children")
          .select("*")
          .eq("case_id", caseRecord.id)
          .order("created_at", { ascending: true });

        const children: Child[] = childrenData?.map((c) => ({
          child_name: c.child_name,
          child_dob: c.child_dob || "",
          school_district: c.school_district || "",
        })) || [];

        if (children.length === 0 && caseRecord.child_name) {
          children.push({ child_name: caseRecord.child_name });
        }

        setCaseData({
          id: caseRecord.id,
          caseNumber: caseRecord.case_number || "",
          county: caseRecord.county || "",
          state: caseRecord.state || "",
          userRole: caseRecord.user_role || "respondent",
          petitionerName: caseRecord.petitioner_name || "",
          respondentName: caseRecord.respondent_name || "",
          userAddress: caseRecord.respondent_address || "Protected Address",
          userCity: caseRecord.respondent_city || "",
          userState: caseRecord.respondent_state || "",
          userZip: caseRecord.respondent_zip || "",
          userPhone: caseRecord.respondent_phone || "",
          userEmail: caseRecord.respondent_email || "",
          children,
        });
        setCaseLoaded(true);
      }
    } catch (err) {
      console.log("No case info found");
    } finally {
      setIsLoading(false);
    }
  };

  // Load existing motions from Supabase
  const loadExistingMotions = async () => {
    if (!caseData?.id) return;
    
    setIsLoadingDocuments(true);
    try {
      const { data, error } = await supabase
        .from("court_documents")
        .select("*")
        .eq("case_id", caseData.id)
        .eq("filed_by", "them")
        .order("filing_date", { ascending: false });

      if (data && !error) {
        setExistingMotions(data);
      }
    } catch (err) {
      console.error("Error loading motions:", err);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  // Handle file drop
  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      setUploadedFile(file);
      await extractTextFromFile(file);
    }
  };

  // Handle file select
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      await extractTextFromFile(file);
    }
  };

  // Extract text from uploaded file
  const extractTextFromFile = async (file: File) => {
    try {
      if (file.type === "text/plain") {
        const text = await file.text();
        setMotionText(text);
      } else {
        // For PDF/Word, prompt user to also paste text
        setMotionText("");
      }
    } catch (err) {
      console.error("Error reading file:", err);
    }
  };

  const getOtherPartyName = () => {
    if (!caseData) return "the other party";
    return caseData.userRole === "petitioner" ? caseData.respondentName : caseData.petitionerName;
  };

  const getUserName = () => {
    if (!caseData) return "";
    return caseData.userRole === "petitioner" ? caseData.petitionerName : caseData.respondentName;
  };

  const getChildrenNames = () => {
    if (!caseData || caseData.children.length === 0) return "the minor child";
    return caseData.children.map((c) => c.child_name).join(", ");
  };

  // Analyze the motion text to extract claims
  const analyzeMotion = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const lines = motionText.split(/\n+/).filter(line => line.trim());
      
      const extractedClaims: MotionClaim[] = [];
      const extractedRelief: string[] = [];
      
      let inReliefSection = false;
      let claimId = 1;

      for (const line of lines) {
        const lowerLine = line.toLowerCase();
        
        if (lowerLine.includes("relief") || lowerLine.includes("prayer") || lowerLine.includes("requests that") || lowerLine.includes("wherefore")) {
          inReliefSection = true;
        }
        
        if (inReliefSection) {
          if (/^\d+[\.\)]|^[a-z][\.\)]|^•|^-/.test(line.trim())) {
            extractedRelief.push(line.trim().replace(/^\d+[\.\)]\s*|^[a-z][\.\)]\s*|^•\s*|^-\s*/, ""));
          }
        } else {
          if (
            lowerLine.includes("petitioner") ||
            lowerLine.includes("respondent") ||
            lowerLine.includes("mother") ||
            lowerLine.includes("father") ||
            lowerLine.includes("failed") ||
            lowerLine.includes("refuses") ||
            lowerLine.includes("has not") ||
            lowerLine.includes("did not") ||
            lowerLine.includes("does not") ||
            lowerLine.includes("alleges") ||
            lowerLine.includes("claims") ||
            lowerLine.includes("states that") ||
            lowerLine.includes("asserts") ||
            /^\d+[\.\)]/.test(line.trim())
          ) {
            if (line.trim().length > 20) {
              extractedClaims.push({
                id: claimId++,
                claim: line.trim().replace(/^\d+[\.\)]\s*/, ""),
                responseType: "",
                response: "",
                evidence: "",
              });
            }
          }
        }
      }

      if (extractedClaims.length === 0) {
        extractedClaims.push({
          id: 1,
          claim: "Review the motion and add their specific claims here",
          responseType: "",
          response: "",
          evidence: "",
        });
      }

      setMotionClaims(extractedClaims);
      setReliefTheyWant(extractedRelief.length > 0 ? extractedRelief : ["Review the motion for what they are asking the court to do"]);
      setStep("respond");
    } catch (err) {
      setError("Could not analyze the motion. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Check response for tone issues
  const checkTone = (text: string): string[] => {
    const warnings: string[] = [];
    const lowerText = text.toLowerCase();

    if (/always|never|constantly|every single time/.test(lowerText)) {
      warnings.push("Avoid absolutes like 'always' or 'never' - they can be challenged");
    }

    if (/narcissist|abuser|liar|crazy|insane|psycho|evil|horrible/.test(lowerText)) {
      warnings.push("Avoid labels and name-calling - describe specific behaviors instead");
    }

    if (/!/.test(text)) {
      warnings.push("Remove exclamation points - they appear emotional");
    }

    if (/[A-Z]{4,}/.test(text)) {
      warnings.push("Avoid ALL CAPS - it appears like shouting");
    }

    if (text.length > 500) {
      warnings.push("This response is getting long - courts prefer concise responses");
    }

    if (/new girlfriend|new boyfriend|their family|mother-in-law|his mom|her mom|his dad|her dad/.test(lowerText)) {
      warnings.push("Stay focused on the children and parenting - avoid extended family unless directly relevant");
    }

    if (/i feel|makes me feel|i think he|i think she/.test(lowerText)) {
      warnings.push("Focus on facts and actions, not feelings or assumptions about their motives");
    }

    return warnings;
  };

  const updateClaimResponse = (index: number, field: keyof MotionClaim, value: string) => {
    const updated = [...motionClaims];
    updated[index] = { ...updated[index], [field]: value };
    setMotionClaims(updated);

    if (field === "response") {
      const allResponses = updated.map(c => c.response).join(" ");
      setToneWarnings(checkTone(allResponses));
    }
  };

  const addClaim = () => {
    setMotionClaims([
      ...motionClaims,
      {
        id: motionClaims.length + 1,
        claim: "",
        responseType: "",
        response: "",
        evidence: "",
      },
    ]);
  };

  const removeClaim = (index: number) => {
    if (motionClaims.length > 1) {
      setMotionClaims(motionClaims.filter((_, i) => i !== index));
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      if (!caseData) {
        setError("No case information found. Please set up your case first.");
        return;
      }

      const responsePoints = motionClaims
        .filter(c => c.response.trim())
        .map(c => {
          let prefix = "";
          if (c.responseType === "deny") prefix = "Denied. ";
          else if (c.responseType === "admit") prefix = "Admitted. ";
          else if (c.responseType === "partial") prefix = "Admitted in part, denied in part. ";
          return prefix + c.response;
        });

      const supportingFacts = motionClaims
        .filter(c => c.evidence.trim())
        .map(c => c.evidence);

      const data = {
        caseNumber: caseData.caseNumber,
        county: caseData.county,
        state: caseData.state,
        userRole: caseData.userRole,
        petitionerName: caseData.petitionerName,
        respondentName: caseData.respondentName,
        userAddress: caseData.userAddress,
        userCity: caseData.userCity,
        userState: caseData.userState,
        userZip: caseData.userZip,
        userPhone: caseData.userPhone,
        userEmail: caseData.userEmail,
        children: caseData.children,
        filingDate: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        opposingMotionTitle: motionTitle,
        opposingMotionDate: motionDate,
        responsePoints,
        supportingFacts,
        reliefRequested: reliefYouWant.filter(r => r.trim()),
      };

      const response = await fetch("/api/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType: "response", data }),
      });

      if (!response.ok) throw new Error("Failed to generate document");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Response-to-Motion.docx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setStep("generate");
    } catch (err) {
      setError("Failed to generate document. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateContempt = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      if (!caseData) {
        setError("No case information found.");
        return;
      }

      const data = {
        caseNumber: caseData.caseNumber,
        county: caseData.county,
        state: caseData.state,
        userRole: caseData.userRole,
        petitionerName: caseData.petitionerName,
        respondentName: caseData.respondentName,
        userAddress: caseData.userAddress,
        userCity: caseData.userCity,
        userState: caseData.userState,
        userZip: caseData.userZip,
        userPhone: caseData.userPhone,
        userEmail: caseData.userEmail,
        children: caseData.children,
        filingDate: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        ...contemptData,
        courtOrderProvisions: contemptData.courtOrderProvisions.filter(p => p.trim()),
        violations: contemptData.violations.filter(v => v.title.trim()),
        reliefRequested: contemptData.reliefRequested.filter(r => r.trim()),
      };

      const response = await fetch("/api/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType: "contempt", data }),
      });

      if (!response.ok) throw new Error("Failed to generate document");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Motion-for-Contempt.docx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setStep("generate");
    } catch (err) {
      setError("Failed to generate document. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const documentTypes = [
    { type: "response", name: "Response to Motion", icon: "📄", description: "They filed something - respond strategically" },
    { type: "contempt", name: "Motion for Contempt", icon: "⚖️", description: "They violated the court order" },
    { type: "pattern-analysis", name: "Pattern Analysis", icon: "🔍", description: "AI summary of communication patterns" },
    { type: "affidavit", name: "Affidavit", icon: "✍️", description: "Sworn statement for any motion" },
  ];

  const resetForm = () => {
    setStep("select");
    setDocumentType("");
    setMotionSource("");
    setMotionText("");
    setMotionTitle("");
    setMotionDate("");
    setMotionClaims([]);
    setReliefTheyWant([]);
    setReliefYouWant([""]);
    setToneWarnings([]);
    setSelectedMotionId(null);
    setUploadedFile(null);
    setError(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-gray-500">Loading case information...</div>
      </div>
    );
  }

  // Disclaimer Step
  if (step === "disclaimer") {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Important Legal Notice</h1>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{LEGAL_DISCLAIMER}</pre>
          </div>
          <div className="flex items-start gap-3 mb-6">
            <input
              type="checkbox"
              id="accept"
              className="w-5 h-5 mt-1"
              checked={hasAcceptedDisclaimer}
              onChange={(e) => setHasAcceptedDisclaimer(e.target.checked)}
            />
            <label htmlFor="accept" className="text-gray-700">
              I understand that Pattern 18 is not a law firm and does not provide legal advice.
            </label>
          </div>
          <button
            onClick={() => setStep("select")}
            disabled={!hasAcceptedDisclaimer}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700"
          >
            I Understand - Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Court Document Generator</h1>
          <p className="text-gray-600 mt-2">
            Generate focused, professional court documents.
            <span className="text-red-600 font-medium"> Not legal advice.</span>
          </p>

          {caseLoaded && caseData ? (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-green-700 text-sm">
                  <strong>{caseData.caseNumber}</strong> | You: {getUserName()} ({caseData.userRole}) | Other: {getOtherPartyName()} | Children: {getChildrenNames()}
                </span>
                <a href="/case-setup" className="text-blue-600 text-sm hover:underline">Edit</a>
              </div>
            </div>
          ) : (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <span className="text-yellow-700 text-sm">No case info saved.</span>
              <a href="/case-setup" className="text-blue-600 text-sm hover:underline ml-2">Set up now</a>
            </div>
          )}
        </div>

        {/* Select Document Type */}
        {step === "select" && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">What do you need to create?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documentTypes.map((doc) => (
                <button
                  key={doc.type}
                  onClick={() => {
                    if (!caseLoaded) {
                      setError("Please set up your case information first.");
                      return;
                    }
                    setDocumentType(doc.type);
                    if (doc.type === "response") {
                      setStep("upload-motion");
                    } else if (doc.type === "contempt") {
                      setStep("respond");
                    } else {
                      setStep("respond");
                    }
                  }}
                  className="p-6 border-2 rounded-xl text-left hover:border-blue-500 hover:bg-blue-50 transition border-gray-200"
                >
                  <div className="text-3xl mb-2">{doc.icon}</div>
                  <div className="font-semibold text-gray-800">{doc.name}</div>
                  <div className="text-sm text-gray-600">{doc.description}</div>
                </button>
              ))}
            </div>
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Upload/Paste Motion */}
        {step === "upload-motion" && documentType === "response" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-2">How do you want to provide their motion?</h2>
              <p className="text-gray-600 mb-6">
                I need to see what they filed so I can help you respond to exactly what they claimed.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <button
                  onClick={() => setMotionSource("existing")}
                  className={`p-4 border-2 rounded-xl text-left transition ${
                    motionSource === "existing" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-2xl mb-2">📁</div>
                  <div className="font-semibold text-gray-800">Already Uploaded</div>
                  <div className="text-sm text-gray-600">Select from your documents</div>
                </button>

                <button
                  onClick={() => setMotionSource("upload")}
                  className={`p-4 border-2 rounded-xl text-left transition ${
                    motionSource === "upload" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-2xl mb-2">📤</div>
                  <div className="font-semibold text-gray-800">Upload Now</div>
                  <div className="text-sm text-gray-600">Upload PDF or Word doc</div>
                </button>

                <button
                  onClick={() => setMotionSource("paste")}
                  className={`p-4 border-2 rounded-xl text-left transition ${
                    motionSource === "paste" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-2xl mb-2">📋</div>
                  <div className="font-semibold text-gray-800">Copy and Paste</div>
                  <div className="text-sm text-gray-600">Paste the motion text</div>
                </button>
              </div>

              {/* Option 1: Select from existing uploads */}
              {motionSource === "existing" && (
                <div className="border-t pt-6">
                  <h3 className="font-medium text-gray-800 mb-4">Select from your uploaded documents:</h3>
                  {isLoadingDocuments ? (
                    <div className="text-gray-500">Loading documents...</div>
                  ) : existingMotions.length > 0 ? (
                    <div className="space-y-2">
                      {existingMotions.map((doc) => (
                        <button
                          key={doc.id}
                          onClick={() => {
                            setSelectedMotionId(doc.id);
                            setMotionTitle(doc.title);
                            setMotionDate(doc.filing_date || "");
                            setMotionText(doc.parsed_content?.text || doc.summary || "");
                          }}
                          className={`w-full p-4 border rounded-lg text-left transition ${
                            selectedMotionId === doc.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <div className="font-medium">{doc.title}</div>
                          <div className="text-sm text-gray-500">
                            Filed: {doc.filing_date || "Unknown"} | By: {doc.filed_by === "them" ? getOtherPartyName() : "You"}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-gray-600 mb-3">No motions uploaded yet.</p>
                      <a href="/upload" className="text-blue-600 hover:underline">
                        Go to Court Orders to upload documents
                      </a>
                    </div>
                  )}

                  {selectedMotionId && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Motion text (edit if needed):</label>
                      <textarea
                        value={motionText}
                        onChange={(e) => setMotionText(e.target.value)}
                        className="w-full border rounded-lg p-3 font-mono text-sm"
                        rows={8}
                        placeholder="The text from the motion will appear here..."
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Option 2: Upload file */}
              {motionSource === "upload" && (
                <div className="border-t pt-6">
                  <h3 className="font-medium text-gray-800 mb-4">Upload their motion:</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Motion Title</label>
                      <input
                        type="text"
                        value={motionTitle}
                        onChange={(e) => setMotionTitle(e.target.value)}
                        className="w-full border rounded-lg p-3"
                        placeholder="e.g., Motion to Modify Parenting Time"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date Filed</label>
                      <input
                        type="date"
                        value={motionDate}
                        onChange={(e) => setMotionDate(e.target.value)}
                        className="w-full border rounded-lg p-3"
                      />
                    </div>
                  </div>
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
                      isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleFileDrop}
                  >
                    <input
                      type="file"
                      id="motion-upload"
                      accept=".pdf,.doc,.docx,.txt"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    <label htmlFor="motion-upload" className="cursor-pointer">
                      <div className="text-4xl mb-2">📄</div>
                      <div className="font-medium text-gray-700">
                        {uploadedFile ? uploadedFile.name : "Drop file here or click to browse"}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">PDF, Word, or Text file</div>
                    </label>
                  </div>
                  {uploadedFile && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                      <span className="text-green-700">✓ {uploadedFile.name}</span>
                      <button onClick={() => setUploadedFile(null)} className="text-red-500 text-sm hover:underline">
                        Remove
                      </button>
                    </div>
                  )}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Paste or edit the motion text:
                    </label>
                    <textarea
                      value={motionText}
                      onChange={(e) => setMotionText(e.target.value)}
                      className="w-full border rounded-lg p-3 font-mono text-sm"
                      rows={8}
                      placeholder="For best results, also paste the text from the motion here..."
                    />
                  </div>
                </div>
              )}

              {/* Option 3: Paste text */}
              {motionSource === "paste" && (
                <div className="border-t pt-6">
                  <h3 className="font-medium text-gray-800 mb-4">Paste the motion text:</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Motion Title</label>
                      <input
                        type="text"
                        value={motionTitle}
                        onChange={(e) => setMotionTitle(e.target.value)}
                        className="w-full border rounded-lg p-3"
                        placeholder="e.g., Motion to Modify Parenting Time"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date Filed</label>
                      <input
                        type="text"
                        value={motionDate}
                        onChange={(e) => setMotionDate(e.target.value)}
                        className="w-full border rounded-lg p-3"
                        placeholder="e.g., December 1, 2025"
                      />
                    </div>
                  </div>
                  <textarea
                    value={motionText}
                    onChange={(e) => setMotionText(e.target.value)}
                    className="w-full border rounded-lg p-3 font-mono text-sm"
                    rows={10}
                    placeholder="Copy and paste the text from their motion here. I will extract the claims they made so you can respond to each one specifically."
                  />
                </div>
              )}

              {/* Why this matters */}
              {motionSource && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                  <h3 className="font-medium text-blue-800 mb-2">Why this matters:</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Respond ONLY to what they actually claimed</li>
                    <li>• Avoid introducing new issues that distract</li>
                    <li>• Stay focused - do not look like the difficult one</li>
                    <li>• Courts appreciate concise, point-by-point responses</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button onClick={() => setStep("select")} className="px-6 py-3 border rounded-lg hover:bg-gray-50">
                Back
              </button>
              <button
                onClick={analyzeMotion}
                disabled={isAnalyzing || !motionTitle.trim() || (!motionText.trim() && !uploadedFile && !selectedMotionId)}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300"
              >
                {isAnalyzing ? "Analyzing..." : "Analyze Motion and Extract Claims"}
              </button>
              <button
                onClick={() => {
                  setMotionClaims([{ id: 1, claim: "", responseType: "", response: "", evidence: "" }]);
                  setReliefTheyWant([""]);
                  setStep("respond");
                }}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Skip Analysis
              </button>
            </div>
          </div>
        )}

        {/* Respond to Claims - Response to Motion */}
        {step === "respond" && documentType === "response" && (
          <div className="space-y-6">
            {/* Tone Warnings */}
            {toneWarnings.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <h3 className="font-semibold text-orange-800 mb-2">Tone Check</h3>
                <ul className="text-sm text-orange-700 space-y-1">
                  {toneWarnings.map((warning, i) => (
                    <li key={i}>⚠️ {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* What They Want */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">What {getOtherPartyName()} is Asking For</h2>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                {reliefTheyWant.map((relief, i) => (
                  <div key={i} className="flex items-start gap-2 mb-2">
                    <span className="text-red-600">•</span>
                    <input
                      type="text"
                      value={relief}
                      onChange={(e) => {
                        const updated = [...reliefTheyWant];
                        updated[i] = e.target.value;
                        setReliefTheyWant(updated);
                      }}
                      className="flex-1 bg-transparent border-b border-red-200 focus:border-red-400 outline-none"
                      placeholder="What are they asking the court to do?"
                    />
                  </div>
                ))}
                <button
                  onClick={() => setReliefTheyWant([...reliefTheyWant, ""])}
                  className="text-red-600 text-sm hover:underline mt-2"
                >
                  + Add another
                </button>
              </div>
            </div>

            {/* Their Claims - Your Responses */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Respond to Their Claims</h2>
                <button onClick={addClaim} className="text-blue-600 text-sm hover:underline">
                  + Add Claim
                </button>
              </div>

              <div className="space-y-6">
                {motionClaims.map((claim, index) => (
                  <div key={claim.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-sm font-medium text-gray-500">Claim {index + 1}</span>
                      {motionClaims.length > 1 && (
                        <button
                          onClick={() => removeClaim(index)}
                          className="text-red-500 text-sm hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {/* Their Claim */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <label className="block text-xs font-medium text-gray-500 mb-1">THEY CLAIM:</label>
                      <textarea
                        value={claim.claim}
                        onChange={(e) => updateClaimResponse(index, "claim", e.target.value)}
                        className="w-full bg-transparent resize-none outline-none text-gray-700"
                        rows={2}
                        placeholder="What did they claim or allege?"
                      />
                    </div>

                    {/* Response Type */}
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-500 mb-2">YOUR RESPONSE:</label>
                      <div className="flex gap-2">
                        {[
                          { value: "deny", label: "Deny", color: "red" },
                          { value: "admit", label: "Admit", color: "green" },
                          { value: "partial", label: "Partially Admit", color: "yellow" },
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => updateClaimResponse(index, "responseType", option.value)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                              claim.responseType === option.value
                                ? option.color === "red"
                                  ? "bg-red-100 text-red-700 border-2 border-red-300"
                                  : option.color === "green"
                                  ? "bg-green-100 text-green-700 border-2 border-green-300"
                                  : "bg-yellow-100 text-yellow-700 border-2 border-yellow-300"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Response Text */}
                    <div className="mb-4">
                      <textarea
                        value={claim.response}
                        onChange={(e) => updateClaimResponse(index, "response", e.target.value)}
                        className="w-full border rounded-lg p-3"
                        rows={3}
                        placeholder={
                          claim.responseType === "deny"
                            ? "Explain why this is not true. Be specific and factual."
                            : claim.responseType === "admit"
                            ? "You can add context if needed, or leave blank to simply admit."
                            : claim.responseType === "partial"
                            ? "Explain what part is true and what part is not."
                            : "Select a response type above, then explain."
                        }
                      />
                    </div>

                    {/* Evidence */}
                    {claim.responseType === "deny" && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">SUPPORTING EVIDENCE:</label>
                        <input
                          type="text"
                          value={claim.evidence}
                          onChange={(e) => updateClaimResponse(index, "evidence", e.target.value)}
                          className="w-full border rounded-lg p-3"
                          placeholder="What evidence supports your denial? (e.g., See Exhibit A - text message dated 11/15/24)"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* What You Want */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">What You Want the Court to Do</h2>
              <div className="space-y-3">
                {reliefYouWant.map((relief, i) => (
                  <input
                    key={i}
                    type="text"
                    value={relief}
                    onChange={(e) => {
                      const updated = [...reliefYouWant];
                      updated[i] = e.target.value;
                      setReliefYouWant(updated);
                    }}
                    className="w-full border rounded-lg p-3"
                    placeholder={`Request ${i + 1} (e.g., Deny the motion, Maintain current schedule)`}
                  />
                ))}
                <button
                  onClick={() => setReliefYouWant([...reliefYouWant, ""])}
                  className="text-blue-600 text-sm hover:underline"
                >
                  + Add another request
                </button>
              </div>
            </div>

            {/* Generate */}
            <div className="flex gap-4">
              <button onClick={() => setStep("upload-motion")} className="px-6 py-3 border rounded-lg hover:bg-gray-50">
                Back
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex-1 bg-green-600 text-white py-4 rounded-xl font-semibold hover:bg-green-700 disabled:bg-gray-300"
              >
                {isGenerating ? "Generating..." : "Generate Response"}
              </button>
            </div>
          </div>
        )}

        {/* Contempt Form */}
        {step === "respond" && documentType === "contempt" && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Motion for Contempt Details</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Court Order Being Violated</label>
                <input
                  type="text"
                  value={contemptData.courtOrderDate}
                  onChange={(e) => setContemptData({ ...contemptData, courtOrderDate: e.target.value })}
                  className="w-full border rounded-lg p-3"
                  placeholder="e.g., January 15, 2020"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relevant Order Provisions</label>
                {contemptData.courtOrderProvisions.map((provision, i) => (
                  <input
                    key={i}
                    type="text"
                    value={provision}
                    onChange={(e) => {
                      const updated = [...contemptData.courtOrderProvisions];
                      updated[i] = e.target.value;
                      setContemptData({ ...contemptData, courtOrderProvisions: updated });
                    }}
                    className="w-full border rounded-lg p-3 mb-2"
                    placeholder={`Provision ${i + 1}`}
                  />
                ))}
                <button
                  onClick={() => setContemptData({ ...contemptData, courtOrderProvisions: [...contemptData.courtOrderProvisions, ""] })}
                  className="text-blue-600 text-sm hover:underline"
                >
                  + Add another provision
                </button>
              </div>
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">Violations</label>
                {contemptData.violations.map((violation, i) => (
                  <div key={i} className="bg-gray-50 p-4 rounded-lg mb-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Violation {i + 1}</span>
                      {contemptData.violations.length > 1 && (
                        <button
                          onClick={() => {
                            const updated = contemptData.violations.filter((_, idx) => idx !== i);
                            setContemptData({ ...contemptData, violations: updated });
                          }}
                          className="text-red-500 text-sm hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={violation.title}
                      onChange={(e) => {
                        const newV = [...contemptData.violations];
                        newV[i] = { ...violation, title: e.target.value };
                        setContemptData({ ...contemptData, violations: newV });
                      }}
                      className="w-full border rounded-lg p-2"
                      placeholder="Title (e.g., Failed to return child on time)"
                    />
                    <input
                      type="text"
                      value={violation.date}
                      onChange={(e) => {
                        const newV = [...contemptData.violations];
                        newV[i] = { ...violation, date: e.target.value };
                        setContemptData({ ...contemptData, violations: newV });
                      }}
                      className="w-full border rounded-lg p-2"
                      placeholder="Date of violation"
                    />
                    <input
                      type="text"
                      value={violation.provisionViolated}
                      onChange={(e) => {
                        const newV = [...contemptData.violations];
                        newV[i] = { ...violation, provisionViolated: e.target.value };
                        setContemptData({ ...contemptData, violations: newV });
                      }}
                      className="w-full border rounded-lg p-2"
                      placeholder="Which provision was violated?"
                    />
                    <input
                      type="text"
                      value={violation.expected}
                      onChange={(e) => {
                        const newV = [...contemptData.violations];
                        newV[i] = { ...violation, expected: e.target.value };
                        setContemptData({ ...contemptData, violations: newV });
                      }}
                      className="w-full border rounded-lg p-2"
                      placeholder="What should have happened?"
                    />
                    <textarea
                      value={violation.actual}
                      onChange={(e) => {
                        const newV = [...contemptData.violations];
                        newV[i] = { ...violation, actual: e.target.value };
                        setContemptData({ ...contemptData, violations: newV });
                      }}
                      className="w-full border rounded-lg p-2"
                      rows={2}
                      placeholder="What actually happened?"
                    />
                    <input
                      type="text"
                      value={violation.childImpact}
                      onChange={(e) => {
                        const newV = [...contemptData.violations];
                        newV[i] = { ...violation, childImpact: e.target.value };
                        setContemptData({ ...contemptData, violations: newV });
                      }}
                      className="w-full border rounded-lg p-2"
                      placeholder="Impact on child(ren)"
                    />
                  </div>
                ))}
                <button
                  onClick={() =>
                    setContemptData({
                      ...contemptData,
                      violations: [
                        ...contemptData.violations,
                        { title: "", date: "", provisionViolated: "", expected: "", actual: "", evidence: "", childImpact: "" },
                      ],
                    })
                  }
                  className="text-blue-600 text-sm hover:underline"
                >
                  + Add another violation
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relief Requested</label>
                {contemptData.reliefRequested.map((relief, i) => (
                  <input
                    key={i}
                    type="text"
                    value={relief}
                    onChange={(e) => {
                      const updated = [...contemptData.reliefRequested];
                      updated[i] = e.target.value;
                      setContemptData({ ...contemptData, reliefRequested: updated });
                    }}
                    className="w-full border rounded-lg p-3 mb-2"
                    placeholder={`Request ${i + 1}`}
                  />
                ))}
                <button
                  onClick={() => setContemptData({ ...contemptData, reliefRequested: [...contemptData.reliefRequested, ""] })}
                  className="text-blue-600 text-sm hover:underline"
                >
                  + Add another request
                </button>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button onClick={() => setStep("select")} className="px-6 py-3 border rounded-lg hover:bg-gray-50">
                Back
              </button>
              <button
                onClick={handleGenerateContempt}
                disabled={isGenerating}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300"
              >
                {isGenerating ? "Generating..." : "Generate Motion"}
              </button>
            </div>
          </div>
        )}

        {/* Pattern Analysis - Coming Soon */}
        {step === "respond" && documentType === "pattern-analysis" && (
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-xl font-semibold mb-2">Pattern Analysis</h2>
            <p className="text-gray-600 mb-6">Coming soon - AI analysis of communication patterns.</p>
            <button onClick={() => setStep("select")} className="px-6 py-3 border rounded-lg hover:bg-gray-50">
              Back
            </button>
          </div>
        )}

        {/* Affidavit - Coming Soon */}
        {step === "respond" && documentType === "affidavit" && (
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-6xl mb-4">✍️</div>
            <h2 className="text-xl font-semibold mb-2">Affidavit Generator</h2>
            <p className="text-gray-600 mb-6">Coming soon - sworn statements with proper formatting.</p>
            <button onClick={() => setStep("select")} className="px-6 py-3 border rounded-lg hover:bg-gray-50">
              Back
            </button>
          </div>
        )}

        {/* Success */}
        {step === "generate" && (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-green-600 mb-4">Document Generated!</h2>
            <p className="text-gray-600 mb-6">Your document has been downloaded.</p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left mb-6">
              <h3 className="font-medium text-yellow-800 mb-2">Before you file:</h3>
              <ul className="space-y-2 text-sm text-yellow-700">
                <li>• Review ALL content in Microsoft Word</li>
                <li>• Verify facts and dates are accurate</li>
                <li>• Check your local court formatting requirements</li>
                <li>• Consider having an attorney review</li>
                <li>• Save as PDF when ready to file</li>
              </ul>
            </div>
            <button
              onClick={resetForm}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
            >
              Create Another Document
            </button>
          </div>
        )}

        {error && step !== "select" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}