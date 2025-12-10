"use client";

// src/app/court-docs/page.tsx
// Pattern 18 Court Document Generator
// NOT LEGAL ADVICE - Organizational tool only

import { useState } from "react";

const LEGAL_DISCLAIMER = `⚠️ IMPORTANT LEGAL NOTICE

Pattern 18 Coach is an ORGANIZATIONAL TOOL, not a law firm.

- We do NOT provide legal advice
- We are NOT a substitute for an attorney
- Documents generated are STARTING POINTS for you to customize

Before filing anything with a court:
✓ Review and verify all content for accuracy
✓ Check your local court's rules and formatting requirements
✓ Consider consulting with a licensed attorney

Your state may have different requirements. Court rules vary by state, county, and even judge. You are responsible for ensuring compliance.`;

interface BaseInfo {
  petitionerName: string;
  respondentName: string;
  respondentCity: string;
  respondentState: string;
  respondentZip: string;
  respondentPhone: string;
  respondentEmail: string;
  caseNumber: string;
  county: string;
  state: string;
  childName: string;
}

export default function CourtDocsPage() {
  const [step, setStep] = useState<"select" | "info" | "details" | "generate">("select");
  const [documentType, setDocumentType] = useState<string>("");
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [baseInfo, setBaseInfo] = useState<BaseInfo>({
    petitionerName: "",
    respondentName: "",
    respondentCity: "",
    respondentState: "",
    respondentZip: "",
    respondentPhone: "",
    respondentEmail: "",
    caseNumber: "",
    county: "",
    state: "",
    childName: "",
  });

  const [responseData, setResponseData] = useState({
    opposingMotionTitle: "",
    opposingMotionDate: "",
    responsePoints: [""],
    supportingFacts: [""],
    reliefRequested: [""],
  });

  const [contemptData, setContemptData] = useState({
    courtOrderDate: "",
    courtOrderProvisions: [""],
    violations: [{ title: "", date: "", provisionViolated: "", expected: "", actual: "", evidence: "", childImpact: "" }],
    reliefRequested: [""],
  });

  const documentTypes = [
    { type: "response", name: "Response to Motion", icon: "📄", description: "When they file something against you" },
    { type: "contempt", name: "Motion for Contempt", icon: "⚖️", description: "They violated the court order" },
    { type: "pattern-analysis", name: "Pattern Analysis", icon: "🔍", description: "AI summary of communication patterns" },
    { type: "affidavit", name: "Affidavit", icon: "✍️", description: "Sworn statement for any motion" },
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      let data: any = {
        ...baseInfo,
        filingDate: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      };

      if (documentType === "response") {
        data = { ...data, ...responseData,
          responsePoints: responseData.responsePoints.filter((p) => p.trim()),
          supportingFacts: responseData.supportingFacts.filter((f) => f.trim()),
          reliefRequested: responseData.reliefRequested.filter((r) => r.trim()),
        };
      } else if (documentType === "contempt") {
        data = { ...data, ...contemptData,
          courtOrderProvisions: contemptData.courtOrderProvisions.filter((p) => p.trim()),
          violations: contemptData.violations.filter((v) => v.title.trim()),
          reliefRequested: contemptData.reliefRequested.filter((r) => r.trim()),
        };
      }

      const response = await fetch("/api/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType, data }),
      });

      if (!response.ok) throw new Error("Failed to generate document");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = response.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || "document.docx";
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

  const addArrayItem = (setter: any, field: string, currentData: any, defaultValue: any = "") => {
    setter({ ...currentData, [field]: [...currentData[field], defaultValue] });
  };

  const updateArrayItem = (setter: any, field: string, index: number, value: any, currentData: any) => {
    const newArray = [...currentData[field]];
    newArray[index] = value;
    setter({ ...currentData, [field]: newArray });
  };

  // Disclaimer Modal
  if (!hasAcceptedDisclaimer) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">⚠️ Important Legal Notice</h1>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{LEGAL_DISCLAIMER}</pre>
          </div>
          <div className="flex items-start gap-3 mb-6">
            <input type="checkbox" id="accept" className="w-5 h-5 mt-1" onChange={(e) => setHasAcceptedDisclaimer(e.target.checked)} />
            <label htmlFor="accept" className="text-gray-700">
              I understand that Pattern 18 is not a law firm and does not provide legal advice. I will review all documents and consult an attorney if needed.
            </label>
          </div>
          <button
            onClick={() => setHasAcceptedDisclaimer(true)}
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
          <h1 className="text-2xl font-bold text-gray-800">📋 Court Document Generator</h1>
          <p className="text-gray-600 mt-2">
            Generate professional court documents from your evidence.
            <span className="text-red-600 font-medium"> Not legal advice.</span>
          </p>
          <div className="flex gap-2 mt-4">
            {["select", "info", "details", "generate"].map((s, i) => (
              <div key={s} className={`flex-1 h-2 rounded ${["select", "info", "details", "generate"].indexOf(step) >= i ? "bg-blue-500" : "bg-gray-200"}`} />
            ))}
          </div>
        </div>

        {/* Step 1: Select Document Type */}
        {step === "select" && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">What do you need to create?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documentTypes.map((doc) => (
                <button
                  key={doc.type}
                  onClick={() => { setDocumentType(doc.type); setStep("info"); }}
                  className={`p-6 border-2 rounded-xl text-left hover:border-blue-500 hover:bg-blue-50 transition ${documentType === doc.type ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}
                >
                  <div className="text-3xl mb-2">{doc.icon}</div>
                  <div className="font-semibold text-gray-800">{doc.name}</div>
                  <div className="text-sm text-gray-600">{doc.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Case Information */}
        {step === "info" && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Case Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Other Parent&apos;s Name (Petitioner)</label>
                <input type="text" value={baseInfo.petitionerName} onChange={(e) => setBaseInfo({ ...baseInfo, petitionerName: e.target.value })} className="w-full border rounded-lg p-3" placeholder="Their full legal name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name (Respondent)</label>
                <input type="text" value={baseInfo.respondentName} onChange={(e) => setBaseInfo({ ...baseInfo, respondentName: e.target.value })} className="w-full border rounded-lg p-3" placeholder="Your full legal name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Case Number</label>
                <input type="text" value={baseInfo.caseNumber} onChange={(e) => setBaseInfo({ ...baseInfo, caseNumber: e.target.value })} className="w-full border rounded-lg p-3" placeholder="e.g., FC2020-001234" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Child&apos;s Name</label>
                <input type="text" value={baseInfo.childName} onChange={(e) => setBaseInfo({ ...baseInfo, childName: e.target.value })} className="w-full border rounded-lg p-3" placeholder="Child's first name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">County</label>
                <input type="text" value={baseInfo.county} onChange={(e) => setBaseInfo({ ...baseInfo, county: e.target.value })} className="w-full border rounded-lg p-3" placeholder="e.g., Maricopa" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input type="text" value={baseInfo.state} onChange={(e) => setBaseInfo({ ...baseInfo, state: e.target.value })} className="w-full border rounded-lg p-3" placeholder="e.g., Arizona" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your City</label>
                <input type="text" value={baseInfo.respondentCity} onChange={(e) => setBaseInfo({ ...baseInfo, respondentCity: e.target.value })} className="w-full border rounded-lg p-3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your State</label>
                <input type="text" value={baseInfo.respondentState} onChange={(e) => setBaseInfo({ ...baseInfo, respondentState: e.target.value })} className="w-full border rounded-lg p-3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Zip</label>
                <input type="text" value={baseInfo.respondentZip} onChange={(e) => setBaseInfo({ ...baseInfo, respondentZip: e.target.value })} className="w-full border rounded-lg p-3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Phone</label>
                <input type="text" value={baseInfo.respondentPhone} onChange={(e) => setBaseInfo({ ...baseInfo, respondentPhone: e.target.value })} className="w-full border rounded-lg p-3" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Email</label>
                <input type="email" value={baseInfo.respondentEmail} onChange={(e) => setBaseInfo({ ...baseInfo, respondentEmail: e.target.value })} className="w-full border rounded-lg p-3" />
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button onClick={() => setStep("select")} className="px-6 py-3 border rounded-lg hover:bg-gray-50">← Back</button>
              <button onClick={() => setStep("details")} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700">Continue →</button>
            </div>
          </div>
        )}

        {/* Step 3: Response Details */}
        {step === "details" && documentType === "response" && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Response to Motion Details</h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">What motion are you responding to?</label>
                  <input type="text" value={responseData.opposingMotionTitle} onChange={(e) => setResponseData({ ...responseData, opposingMotionTitle: e.target.value })} className="w-full border rounded-lg p-3" placeholder="e.g., Motion to Modify Parenting Time" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">When was it filed?</label>
                  <input type="text" value={responseData.opposingMotionDate} onChange={(e) => setResponseData({ ...responseData, opposingMotionDate: e.target.value })} className="w-full border rounded-lg p-3" placeholder="e.g., December 1, 2025" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Main Points</label>
                {responseData.responsePoints.map((point, i) => (
                  <input key={i} type="text" value={point} onChange={(e) => updateArrayItem(setResponseData, "responsePoints", i, e.target.value, responseData)} className="w-full border rounded-lg p-3 mb-2" placeholder={`Point ${i + 1}`} />
                ))}
                <button onClick={() => addArrayItem(setResponseData, "responsePoints", responseData)} className="text-blue-600 text-sm hover:underline">+ Add another point</button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supporting Facts</label>
                {responseData.supportingFacts.map((fact, i) => (
                  <textarea key={i} value={fact} onChange={(e) => updateArrayItem(setResponseData, "supportingFacts", i, e.target.value, responseData)} className="w-full border rounded-lg p-3 mb-2" rows={2} placeholder={`Fact ${i + 1}`} />
                ))}
                <button onClick={() => addArrayItem(setResponseData, "supportingFacts", responseData)} className="text-blue-600 text-sm hover:underline">+ Add another fact</button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">What do you want the court to do?</label>
                {responseData.reliefRequested.map((relief, i) => (
                  <input key={i} type="text" value={relief} onChange={(e) => updateArrayItem(setResponseData, "reliefRequested", i, e.target.value, responseData)} className="w-full border rounded-lg p-3 mb-2" placeholder={`Request ${i + 1}`} />
                ))}
                <button onClick={() => addArrayItem(setResponseData, "reliefRequested", responseData)} className="text-blue-600 text-sm hover:underline">+ Add another request</button>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button onClick={() => setStep("info")} className="px-6 py-3 border rounded-lg hover:bg-gray-50">← Back</button>
              <button onClick={handleGenerate} disabled={isGenerating} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300">
                {isGenerating ? "Generating..." : "📄 Generate Document"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Contempt Details */}
        {step === "details" && documentType === "contempt" && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Motion for Contempt Details</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Court Order Being Violated</label>
                <input type="text" value={contemptData.courtOrderDate} onChange={(e) => setContemptData({ ...contemptData, courtOrderDate: e.target.value })} className="w-full border rounded-lg p-3" placeholder="e.g., January 15, 2020" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relevant Order Provisions</label>
                {contemptData.courtOrderProvisions.map((provision, i) => (
                  <input key={i} type="text" value={provision} onChange={(e) => updateArrayItem(setContemptData, "courtOrderProvisions", i, e.target.value, contemptData)} className="w-full border rounded-lg p-3 mb-2" placeholder={`Provision ${i + 1}`} />
                ))}
                <button onClick={() => addArrayItem(setContemptData, "courtOrderProvisions", contemptData)} className="text-blue-600 text-sm hover:underline">+ Add another provision</button>
              </div>
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">Violations</label>
                {contemptData.violations.map((violation, i) => (
                  <div key={i} className="bg-gray-50 p-4 rounded-lg mb-4 space-y-3">
                    <div className="font-medium">Violation {i + 1}</div>
                    <input type="text" value={violation.title} onChange={(e) => { const newV = [...contemptData.violations]; newV[i] = { ...violation, title: e.target.value }; setContemptData({ ...contemptData, violations: newV }); }} className="w-full border rounded-lg p-2" placeholder="Title (e.g., Involving Child in Decisions)" />
                    <input type="text" value={violation.date} onChange={(e) => { const newV = [...contemptData.violations]; newV[i] = { ...violation, date: e.target.value }; setContemptData({ ...contemptData, violations: newV }); }} className="w-full border rounded-lg p-2" placeholder="Date of violation" />
                    <textarea value={violation.actual} onChange={(e) => { const newV = [...contemptData.violations]; newV[i] = { ...violation, actual: e.target.value }; setContemptData({ ...contemptData, violations: newV }); }} className="w-full border rounded-lg p-2" rows={2} placeholder="What actually happened" />
                    <input type="text" value={violation.childImpact} onChange={(e) => { const newV = [...contemptData.violations]; newV[i] = { ...violation, childImpact: e.target.value }; setContemptData({ ...contemptData, violations: newV }); }} className="w-full border rounded-lg p-2" placeholder="Impact on child" />
                  </div>
                ))}
                <button onClick={() => setContemptData({ ...contemptData, violations: [...contemptData.violations, { title: "", date: "", provisionViolated: "", expected: "", actual: "", evidence: "", childImpact: "" }] })} className="text-blue-600 text-sm hover:underline">+ Add another violation</button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relief Requested</label>
                {contemptData.reliefRequested.map((relief, i) => (
                  <input key={i} type="text" value={relief} onChange={(e) => updateArrayItem(setContemptData, "reliefRequested", i, e.target.value, contemptData)} className="w-full border rounded-lg p-3 mb-2" placeholder={`Request ${i + 1}`} />
                ))}
                <button onClick={() => addArrayItem(setContemptData, "reliefRequested", contemptData)} className="text-blue-600 text-sm hover:underline">+ Add another request</button>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button onClick={() => setStep("info")} className="px-6 py-3 border rounded-lg hover:bg-gray-50">← Back</button>
              <button onClick={handleGenerate} disabled={isGenerating} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300">
                {isGenerating ? "Generating..." : "📄 Generate Document"}
              </button>
            </div>
          </div>
        )}

        {/* Success State */}
        {step === "generate" && (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-green-600 mb-4">Document Generated!</h2>
            <p className="text-gray-600 mb-6">Your document has been downloaded. Remember to:</p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left mb-6">
              <ul className="space-y-2 text-sm">
                <li>✓ Open in Microsoft Word and review ALL content</li>
                <li>✓ Verify all facts and dates are accurate</li>
                <li>✓ Check your local court&apos;s formatting requirements</li>
                <li>✓ Add any additional evidence or exhibits</li>
                <li>✓ Consider having an attorney review before filing</li>
                <li>✓ Save as PDF when ready to file</li>
              </ul>
            </div>
            <button onClick={() => { setStep("select"); setDocumentType(""); }} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700">
              Create Another Document
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}