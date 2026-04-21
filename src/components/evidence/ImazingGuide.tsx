'use client';

/**
 * iMazing Setup Guide Component
 * Displays step-by-step instructions for exporting messages
 * 
 * Usage: <ImazingGuide />
 * Or as modal: <ImazingGuide asModal onClose={() => {}} />
 */

import { useState } from 'react';

interface ImazingGuideProps {
  asModal?: boolean;
  onClose?: () => void;
}

export default function ImazingGuide({ asModal = false, onClose }: ImazingGuideProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 8;

  const content = (
    <div className={asModal ? '' : 'max-w-3xl mx-auto'}>
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          How to Export Your Messages
        </h2>
        <p className="text-gray-600">
          Follow these steps to export messages from your iPhone using iMazing
        </p>
      </div>

      {/* Progress */}
      <div className="flex justify-center gap-2 mb-8">
        {Array.from({ length: totalSteps }, (_, i) => (
          <button
            key={i}
            onClick={() => setCurrentStep(i + 1)}
            className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
              currentStep === i + 1
                ? 'bg-green-600 text-white'
                : currentStep > i + 1
                ? 'bg-green-200 text-green-700'
                : 'bg-gray-200 text-gray-500'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl border p-6 mb-6 min-h-[300px]">
        {currentStep === 1 && <Step1 />}
        {currentStep === 2 && <Step2 />}
        {currentStep === 3 && <Step3 />}
        {currentStep === 4 && <Step4 />}
        {currentStep === 5 && <Step5 />}
        {currentStep === 6 && <Step6 />}
        {currentStep === 7 && <Step7 />}
        {currentStep === 8 && <Step8 />}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          className="px-6 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          ← Previous
        </button>
        
        {currentStep < totalSteps ? (
          <button
            onClick={() => setCurrentStep(currentStep + 1)}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={onClose}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Done - Start Upload
          </button>
        )}
      </div>
    </div>
  );

  if (asModal) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-50 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {content}
        </div>
      </div>
    );
  }

  return content;
}

// Individual Step Components

function Step1() {
  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        Step 1: Download iMazing
      </h3>
      <p className="text-gray-600 mb-6">
        iMazing is the recommended tool for exporting text messages. It creates court-admissible exports with timestamps and metadata.
      </p>
      
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <a
          href="https://imazing.com/download/macos"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50"
        >
          <div className="text-3xl">🍎</div>
          <div>
            <div className="font-medium">Download for Mac</div>
            <div className="text-sm text-gray-500">macOS 10.10+</div>
          </div>
        </a>
        <a
          href="https://imazing.com/download/windows"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50"
        >
          <div className="text-3xl">🪟</div>
          <div>
            <div className="font-medium">Download for Windows</div>
            <div className="text-sm text-gray-500">Windows 10+</div>
          </div>
        </a>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-2">
          <span className="text-blue-500">💡</span>
          <div className="text-sm text-blue-700">
            <strong>Pricing:</strong> Free version allows limited exports. Full version is $44.99 (one-time purchase). Check their website for sales!
          </div>
        </div>
      </div>
    </div>
  );
}

function Step2() {
  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        Step 2: Install iMazing
      </h3>
      
      <div className="space-y-6">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">🍎 Mac</h4>
          <ol className="list-decimal list-inside space-y-2 text-gray-600">
            <li>Open the downloaded <code className="bg-gray-100 px-1 rounded">.dmg</code> file</li>
            <li>Drag iMazing to your Applications folder</li>
            <li>Open iMazing from Applications</li>
          </ol>
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2">🪟 Windows</h4>
          <ol className="list-decimal list-inside space-y-2 text-gray-600">
            <li>Run the downloaded <code className="bg-gray-100 px-1 rounded">.exe</code> file</li>
            <li>Follow the installation wizard</li>
            <li>Launch iMazing from Start menu</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function Step3() {
  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        Step 3: Connect Your iPhone
      </h3>
      
      <ol className="list-decimal list-inside space-y-4 text-gray-600 mb-6">
        <li><strong>Connect your iPhone</strong> to your computer with a USB cable</li>
        <li>If prompted on your iPhone, tap <strong>"Trust This Computer"</strong></li>
        <li>Enter your iPhone passcode if asked</li>
        <li>Wait for iMazing to recognize your device (may take a minute)</li>
      </ol>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex gap-2">
          <span className="text-yellow-500">⚠️</span>
          <div className="text-sm text-yellow-700">
            <strong>Important:</strong> Make sure your iPhone is unlocked when you first connect. You may need to enter your passcode multiple times.
          </div>
        </div>
      </div>
    </div>
  );
}

function Step4() {
  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        Step 4: Access Messages
      </h3>
      
      <ol className="list-decimal list-inside space-y-4 text-gray-600 mb-6">
        <li>Click on your <strong>iPhone</strong> in the left sidebar</li>
        <li>Click <strong>"Messages"</strong> in the main panel</li>
        <li>Wait for messages to load</li>
      </ol>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-2">
          <span className="text-blue-500">⏱️</span>
          <div className="text-sm text-blue-700">
            <strong>Be patient:</strong> Loading messages can take several minutes if you have a large message history. Don't close iMazing while it's loading.
          </div>
        </div>
      </div>
    </div>
  );
}

function Step5() {
  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        Step 5: Find the Conversation
      </h3>
      
      <ol className="list-decimal list-inside space-y-4 text-gray-600 mb-6">
        <li>In the left panel, you'll see all your conversations</li>
        <li><strong>Search</strong> by name or phone number, or scroll to find your co-parent's conversation</li>
        <li><strong>Click on the conversation</strong> to select it</li>
      </ol>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex gap-2">
          <span className="text-green-500">✓</span>
          <div className="text-sm text-green-700">
            <strong>Tip:</strong> If you can't find the conversation by name, try searching by their phone number instead.
          </div>
        </div>
      </div>
    </div>
  );
}

function Step6() {
  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        Step 6: Select Date Range (Optional)
      </h3>
      
      <p className="text-gray-600 mb-4">
        To export only specific dates (recommended for large histories):
      </p>

      <ol className="list-decimal list-inside space-y-4 text-gray-600 mb-6">
        <li>Click the <strong>filter icon</strong> (funnel) at the top</li>
        <li>Set <strong>"From"</strong> and <strong>"To"</strong> dates</li>
        <li>Click <strong>Apply</strong></li>
      </ol>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex gap-2">
          <span className="text-green-500">💡</span>
          <div className="text-sm text-green-700">
            <strong>For court:</strong> Export in chunks by incident or time period rather than years of messages. This makes it easier to organize evidence.
          </div>
        </div>
      </div>
    </div>
  );
}

function Step7() {
  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        Step 7: Export Messages
      </h3>
      
      <div className="space-y-6">
        <div className="p-4 border rounded-lg">
          <h4 className="font-medium text-gray-700 mb-2">📄 Export as PDF (Recommended for Court)</h4>
          <ol className="list-decimal list-inside space-y-2 text-gray-600 text-sm">
            <li>Click <strong>"Export"</strong> in the bottom toolbar</li>
            <li>Select <strong>"PDF"</strong></li>
            <li>Choose where to save the file</li>
            <li>Click <strong>"Export"</strong></li>
          </ol>
        </div>

        <div className="p-4 border rounded-lg">
          <h4 className="font-medium text-gray-700 mb-2">📊 Export as CSV (Best for Analysis)</h4>
          <ol className="list-decimal list-inside space-y-2 text-gray-600 text-sm">
            <li>Click <strong>"Export"</strong> in the bottom toolbar</li>
            <li>Select <strong>"CSV"</strong></li>
            <li>Choose where to save the file</li>
            <li>Click <strong>"Export"</strong></li>
          </ol>
        </div>

        <div className="grid grid-cols-2 gap-4 text-center text-sm">
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="font-medium text-green-700">PDF</div>
            <div className="text-green-600">Best for court exhibits</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="font-medium text-blue-700">CSV</div>
            <div className="text-blue-600">Best for pattern analysis</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step8() {
  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        Step 8: Upload to Pattern18
      </h3>
      
      <ol className="list-decimal list-inside space-y-4 text-gray-600 mb-6">
        <li>Go to <strong>Evidence</strong> in Pattern18</li>
        <li><strong>Drag and drop</strong> your exported file, or click to browse</li>
        <li>Wait for analysis to complete</li>
        <li>Review detected patterns and incidents</li>
      </ol>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <div className="text-green-600 text-4xl mb-2">🎉</div>
        <div className="font-medium text-green-700">You're ready!</div>
        <div className="text-sm text-green-600">
          Click "Done" below to start uploading your messages
        </div>
      </div>
    </div>
  );
}

// Quick reference card component for embedding elsewhere
export function ImazingQuickGuide() {
  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <h3 className="font-semibold text-gray-800 mb-4">Quick Export Guide</h3>
      <ol className="space-y-2 text-sm text-gray-600">
        <li className="flex gap-2">
          <span className="bg-green-100 text-green-700 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium">1</span>
          <span>Download iMazing from <a href="https://imazing.com" className="text-green-600 underline">imazing.com</a></span>
        </li>
        <li className="flex gap-2">
          <span className="bg-green-100 text-green-700 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium">2</span>
          <span>Connect iPhone via USB, tap "Trust"</span>
        </li>
        <li className="flex gap-2">
          <span className="bg-green-100 text-green-700 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium">3</span>
          <span>Click Messages → Find conversation</span>
        </li>
        <li className="flex gap-2">
          <span className="bg-green-100 text-green-700 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium">4</span>
          <span>Export → PDF or CSV</span>
        </li>
        <li className="flex gap-2">
          <span className="bg-green-100 text-green-700 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium">5</span>
          <span>Upload to Pattern18</span>
        </li>
      </ol>
    </div>
  );
}