'use client';

import BulkMessageUpload from '@/components/evidence/BulkMessageUpload';

export default function EvidencePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-12 px-4">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Evidence Documentation
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Upload your iMazing message exports to detect patterns, 
            organize incidents, and generate court-ready documentation.
          </p>
        </div>

        <BulkMessageUpload />
      </div>
    </div>
  );
}