'use client';

/**
 * BulkMessageUpload Component
 * Handles file upload, parsing, pattern detection, and court coaching
 */

import { useState, useCallback } from 'react';
// Update these import paths if your project structure differs
import { 
  parseCSV, 
  parsePDF, 
  detectFormat, 
  getCourtCoaching,
  type FileFormat,
  type ParseResult,
  type CourtCoachingMessage
} from '@/lib/parsers/imazing-parser';
import { 
  analyzeBulk, 
  type BulkAnalysisResult,
  PATTERNS 
} from '@/lib/parsers/pattern-detection';
import { 
  detectIncidents,
  type Incident,
  type IncidentDetectionResult,
  CATEGORY_DISPLAY_NAMES
} from '@/lib/parsers/incident-detection';
import { 
  generateExhibitHTML, 
  type ExhibitOptions 
} from '@/lib/parsers/exhibit-generator';

// ============================================
// TYPES
// ============================================

type UploadStep = 'upload' | 'coaching' | 'analyzing' | 'results';

interface UploadState {
  step: UploadStep;
  file: File | null;
  format: FileFormat;
  coaching: CourtCoachingMessage[];
  parseResult: ParseResult | null;
  analysisResult: BulkAnalysisResult | null;
  incidentResult: IncidentDetectionResult | null;
  error: string | null;
  isProcessing: boolean;
}

// ============================================
// COMPONENT
// ============================================

export default function BulkMessageUpload() {
  const [state, setState] = useState<UploadState>({
    step: 'upload',
    file: null,
    format: 'unknown',
    coaching: [],
    parseResult: null,
    analysisResult: null,
    incidentResult: null,
    error: null,
    isProcessing: false
  });

  // File drop handler
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      await processFile(file);
    }
  }, []);

  // File input handler
  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  }, []);

  // Main file processing
  const processFile = async (file: File) => {
    setState(prev => ({ ...prev, isProcessing: true, error: null, file }));

    try {
      const format = detectFormat(file.name);
      const coaching = getCourtCoaching(format, 1);

      // Show coaching for screenshots (weak evidence)
      if (format === 'image') {
        setState(prev => ({
          ...prev,
          step: 'coaching',
          format,
          coaching,
          isProcessing: false
        }));
        return;
      }

      // Proceed directly for PDF and CSV
      if (format === 'pdf' || format === 'csv') {
        await parseAndAnalyze(file, format);
      } else {
        setState(prev => ({
          ...prev,
          error: 'Unsupported file format. Please upload a CSV or PDF from iMazing.',
          isProcessing: false
        }));
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Unknown error occurred',
        isProcessing: false
      }));
    }
  };

  // Parse and analyze the file
  const parseAndAnalyze = async (file: File, format: FileFormat) => {
    setState(prev => ({ ...prev, step: 'analyzing', isProcessing: true }));

    try {
      const content = await file.text();
      
      let parseResult: ParseResult;
      if (format === 'csv') {
        parseResult = parseCSV(content);
      } else {
        parseResult = parsePDF(content);
      }

      if (!parseResult.success) {
        throw new Error(parseResult.errors.join(', '));
      }

      // Run pattern detection
      const analysisResult = analyzeBulk(parseResult.messages);

      // Detect incidents
      const incidentResult = detectIncidents(analysisResult.messages);

      setState(prev => ({
        ...prev,
        step: 'results',
        parseResult,
        analysisResult,
        incidentResult,
        isProcessing: false
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to analyze messages',
        step: 'upload',
        isProcessing: false
      }));
    }
  };

  // Continue after coaching
  const handleContinue = async () => {
    if (state.file) {
      await parseAndAnalyze(state.file, state.format);
    }
  };

  // Generate and download exhibit
  const handleDownloadExhibit = async (options: Partial<ExhibitOptions> = {}) => {
    if (!state.analysisResult) return;

    const html = generateExhibitHTML(state.analysisResult, options);
    
    // Create blob and download
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evidence-exhibit-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Reset to start over
  const handleReset = () => {
    setState({
      step: 'upload',
      file: null,
      format: 'unknown',
      coaching: [],
      parseResult: null,
      analysisResult: null,
      incidentResult: null,
      error: null,
      isProcessing: false
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Error display */}
      {state.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <strong>Error:</strong> {state.error}
          <button 
            onClick={() => setState(prev => ({ ...prev, error: null }))}
            className="ml-4 text-red-500 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Step */}
      {state.step === 'upload' && (
        <UploadSection
          onDrop={handleDrop}
          onFileInput={handleFileInput}
          isProcessing={state.isProcessing}
        />
      )}

      {/* Coaching Step */}
      {state.step === 'coaching' && (
        <CoachingSection
          format={state.format}
          coaching={state.coaching}
          onContinue={handleContinue}
          onReset={handleReset}
        />
      )}

      {/* Analyzing Step */}
      {state.step === 'analyzing' && (
        <AnalyzingSection />
      )}

      {/* Results Step */}
      {state.step === 'results' && state.analysisResult && (
        <ResultsSection
          analysis={state.analysisResult}
          incidents={state.incidentResult}
          parseResult={state.parseResult!}
          onDownloadExhibit={handleDownloadExhibit}
          onReset={handleReset}
        />
      )}
    </div>
  );
}

// ============================================
// SUBCOMPONENTS
// ============================================

function UploadSection({ 
  onDrop, 
  onFileInput, 
  isProcessing 
}: { 
  onDrop: (e: React.DragEvent) => void;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isProcessing: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        Upload Messages for Analysis
      </h2>
      <p className="text-gray-600 mb-6">
        Import your iMazing export to detect patterns and build court-ready documentation
      </p>

      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        className={`
          border-2 border-dashed rounded-xl p-12 transition-all
          ${isDragging 
            ? 'border-green-500 bg-green-50' 
            : 'border-gray-300 hover:border-green-400 hover:bg-gray-50'
          }
          ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
              />
            </svg>
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-700">
              Drop your file here, or{' '}
              <label className="text-green-600 hover:text-green-700 cursor-pointer underline">
                browse
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".csv,.pdf,.png,.jpg,.jpeg"
                  onChange={onFileInput}
                  disabled={isProcessing}
                />
              </label>
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Supports: iMazing CSV, iMazing PDF, Screenshots
            </p>
          </div>
        </div>
      </div>

      {/* Format recommendations */}
      <div className="mt-8 grid grid-cols-3 gap-4 text-left">
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-600">★★★</span>
            <span className="font-medium">PDF</span>
          </div>
          <p className="text-sm text-gray-600">
            Preferred for court. Preserves formatting, hard to alter.
          </p>
        </div>
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-yellow-600">★★★</span>
            <span className="font-medium">CSV</span>
          </div>
          <p className="text-sm text-gray-600">
            Includes metadata. Good for analysis, can export to PDF.
          </p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-gray-400">★</span>
            <span className="font-medium">Screenshots</span>
          </div>
          <p className="text-sm text-gray-600">
            Quick but weak evidence. Easy to dispute in court.
          </p>
        </div>
      </div>
    </div>
  );
}

function CoachingSection({
  format,
  coaching,
  onContinue,
  onReset
}: {
  format: FileFormat;
  coaching: CourtCoachingMessage[];
  onContinue: () => void;
  onReset: () => void;
}) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
          />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        Court Documentation Tip
      </h2>

      <div className="max-w-lg mx-auto text-left my-6 space-y-4">
        {coaching.map((msg, i) => (
          <div 
            key={i}
            className={`p-4 rounded-lg ${
              msg.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
              msg.type === 'suggestion' ? 'bg-blue-50 border border-blue-200' :
              'bg-gray-50 border border-gray-200'
            }`}
          >
            <p className="text-gray-700">{msg.message}</p>
            {msg.action && (
              <p className="text-sm text-gray-500 mt-2 italic">{msg.action}</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-4 justify-center">
        <button
          onClick={onReset}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Upload Different File
        </button>
        <button
          onClick={onContinue}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Continue with This File
        </button>
      </div>

      {format === 'image' && (
        <div className="mt-8 p-6 bg-gray-50 rounded-lg max-w-lg mx-auto text-left">
          <h3 className="font-medium mb-2">How to Export from iMazing:</h3>
          <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
            <li>Connect your iPhone to your computer</li>
            <li>Open iMazing and select Messages</li>
            <li>Find the conversation with your co-parent</li>
            <li>Click Export → PDF (recommended) or CSV</li>
            <li>Upload the exported file here</li>
          </ol>
        </div>
      )}
    </div>
  );
}

function AnalyzingSection() {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
        <svg className="w-8 h-8 text-green-600 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
      <h2 className="text-xl font-medium text-gray-700">Analyzing Messages...</h2>
      <p className="text-gray-500 mt-2">Detecting patterns and building documentation</p>
    </div>
  );
}

function ResultsSection({
  analysis,
  incidents,
  parseResult,
  onDownloadExhibit,
  onReset
}: {
  analysis: BulkAnalysisResult;
  incidents: IncidentDetectionResult | null;
  parseResult: ParseResult;
  onDownloadExhibit: (options?: Partial<ExhibitOptions>) => void;
  onReset: () => void;
}) {
  const s = analysis.summary;
  const [showIncidents, setShowIncidents] = useState(true);

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Analysis Complete</h2>
          <p className="text-gray-600">
            {parseResult.metadata.coparentName && `Communication with ${parseResult.metadata.coparentName}`}
            {s.dateRange && ` • ${s.dateRange.start.toLocaleDateString()} - ${s.dateRange.end.toLocaleDateString()}`}
          </p>
        </div>
        <button
          onClick={onReset}
          className="text-gray-500 hover:text-gray-700"
        >
          ← Analyze New File
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard label="Total Messages" value={s.totalMessages} />
        <StatCard 
          label="Incidents" 
          value={incidents?.summary.totalIncidents || 0} 
          variant="info"
        />
        <StatCard label="Patterns Detected" value={s.totalPatternMatches} />
        <StatCard 
          label="Critical Severity" 
          value={s.criticalCount} 
          variant={s.criticalCount > 0 ? 'danger' : 'default'}
        />
        <StatCard 
          label="High Severity" 
          value={s.highSeverityCount}
          variant={s.highSeverityCount > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Incidents Section */}
      {incidents && incidents.incidents.length > 0 && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-800">
              Detected Incidents ({incidents.incidents.length})
            </h3>
            <button
              onClick={() => setShowIncidents(!showIncidents)}
              className="text-sm text-green-600 hover:text-green-700"
            >
              {showIncidents ? 'Hide' : 'Show'} Incidents
            </button>
          </div>
          
          {showIncidents && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {incidents.incidents.map((incident) => (
                <IncidentCard key={incident.id} incident={incident} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Court Readiness */}
      <div className={`p-4 rounded-lg mb-8 ${
        analysis.courtReady 
          ? 'bg-green-50 border border-green-200' 
          : 'bg-yellow-50 border border-yellow-200'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          {analysis.courtReady ? (
            <>
              <span className="text-green-600 text-xl">✓</span>
              <span className="font-medium text-green-700">Ready for Court Presentation</span>
            </>
          ) : (
            <>
              <span className="text-yellow-600 text-xl">⚠</span>
              <span className="font-medium text-yellow-700">Documentation In Progress</span>
            </>
          )}
        </div>
        <ul className="text-sm text-gray-600 space-y-1">
          {analysis.courtReadyNotes.map((note, i) => (
            <li key={i}>• {note}</li>
          ))}
        </ul>
      </div>

      {/* Top Patterns */}
      {analysis.topPatterns.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Most Common Patterns</h3>
          <div className="space-y-3">
            {analysis.topPatterns.map(({ pattern, count, examples }) => (
              <div key={pattern.id} className="p-4 bg-white border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mr-2 ${
                      pattern.severity === 'critical' ? 'bg-red-100 text-red-700' :
                      pattern.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                      pattern.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {pattern.severity}
                    </span>
                    <span className="font-medium">{pattern.name}</span>
                  </div>
                  <span className="text-gray-500 text-sm">{count} instances</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{pattern.description}</p>
                {examples.length > 0 && (
                  <div className="mt-2 text-xs text-gray-500 italic">
                    Example: "{examples[0]}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Download Options */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Generate Court Exhibit</h3>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => onDownloadExhibit({ 
              includeAllMessages: false, 
              highlightSeverity: 'high' 
            })}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Download Evidence Exhibit (PDF-ready HTML)
          </button>
          <button
            onClick={() => onDownloadExhibit({ 
              includeAllMessages: true, 
              highlightSeverity: 'all' 
            })}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-white"
          >
            Download Full Transcript
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-3">
          Open the HTML file in your browser and print to PDF for court submission.
        </p>
      </div>
    </div>
  );
}

function IncidentCard({ incident }: { incident: Incident }) {
  const categoryName = CATEGORY_DISPLAY_NAMES[incident.category] || incident.category;
  
  return (
    <div className={`p-4 border rounded-lg ${
      incident.maxSeverity === 'critical' ? 'border-red-200 bg-red-50' :
      incident.maxSeverity === 'high' ? 'border-orange-200 bg-orange-50' :
      'border-gray-200 bg-white'
    }`}>
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium text-gray-800">{incident.title}</h4>
          <p className="text-sm text-gray-500">
            {incident.startTime.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            })}
            {incident.durationMinutes > 0 && ` • ${incident.durationMinutes} min`}
            {` • ${incident.messageCount} messages`}
          </p>
        </div>
        <div className="text-right">
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
            incident.evidenceStrength === 'strong' ? 'bg-green-100 text-green-700' :
            incident.evidenceStrength === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {incident.evidenceStrength}
          </span>
        </div>
      </div>
      
      {incident.uniquePatterns.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {incident.uniquePatterns.slice(0, 4).map((pattern, i) => (
            <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
              {pattern}
            </span>
          ))}
          {incident.uniquePatterns.length > 4 && (
            <span className="text-xs text-gray-400">
              +{incident.uniquePatterns.length - 4} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  variant = 'default' 
}: { 
  label: string; 
  value: number; 
  variant?: 'default' | 'warning' | 'danger' | 'info';
}) {
  return (
    <div className={`p-4 rounded-lg text-center ${
      variant === 'danger' ? 'bg-red-50 border border-red-200' :
      variant === 'warning' ? 'bg-orange-50 border border-orange-200' :
      variant === 'info' ? 'bg-blue-50 border border-blue-200' :
      'bg-gray-50 border border-gray-200'
    }`}>
      <div className={`text-3xl font-bold ${
        variant === 'danger' ? 'text-red-600' :
        variant === 'warning' ? 'text-orange-600' :
        variant === 'info' ? 'text-blue-600' :
        'text-gray-800'
      }`}>
        {value}
      </div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}