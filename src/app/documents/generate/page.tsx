"use client";

import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";

export default function GenerateDocumentPage() {
  const router = useRouter();

  const docTypes = [
    {
      id: 'respond',
      icon: '📩',
      title: 'Response to Filing',
      desc: 'They filed something and you need to respond',
      details: 'Upload their motion/petition, we\'ll extract claims and help you respond with evidence',
      path: '/court-docs/respond'
    },
    {
      id: 'motion',
      icon: '📋',
      title: 'Motion / Petition',
      desc: 'You want to file something with the court',
      details: 'Create a motion to modify, contempt petition, or other filing with supporting evidence',
      path: '/court-docs/motion'
    },
    {
      id: 'exhibit',
      icon: '📎',
      title: 'Exhibit Package',
      desc: 'Bundle evidence for court submission',
      details: 'Select incidents and generate professionally formatted exhibits',
      path: '/court-docs/exhibit'
    },
    {
      id: 'summary',
      icon: '📊',
      title: 'Pattern Summary Report',
      desc: 'Show documented behavior patterns',
      details: 'Generate a report showing pattern frequency, timeline, and severity',
      path: '/court-docs/summary'
    },
    {
      id: 'affidavit',
      icon: '✍️',
      title: 'Affidavit / Declaration',
      desc: 'Sworn statement of facts',
      details: 'Create a declaration with your testimony and supporting evidence',
      path: '/court-docs/affidavit'
    }
  ];

  return (
    <AppLayout>
      <div className="generate-page">
        <div className="page-header">
          <h1>✨ Generate Document</h1>
          <p>What type of document do you need?</p>
        </div>

        <div className="doc-options">
          {docTypes.map((doc) => (
            <button 
              key={doc.id} 
              className="doc-option"
              onClick={() => router.push(doc.path)}
            >
              <div className="doc-icon">{doc.icon}</div>
              <div className="doc-content">
                <h3>{doc.title}</h3>
                <p className="doc-desc">{doc.desc}</p>
                <p className="doc-details">{doc.details}</p>
              </div>
              <span className="arrow">→</span>
            </button>
          ))}
        </div>

        <div className="help-box">
          <h4>💡 Not sure what you need?</h4>
          <p>
            <strong>Responding to something they filed?</strong> → Use "Response to Filing"<br/>
            <strong>Want to ask the court for something?</strong> → Use "Motion / Petition"<br/>
            <strong>Just need to organize evidence?</strong> → Use "Exhibit Package"
          </p>
          <button onClick={() => router.push("/coach")}>Ask the Coach for Help</button>
        </div>
      </div>

      <style jsx>{`
        .generate-page {
          max-width: 800px;
          margin: 0 auto;
        }

        .page-header {
          text-align: center;
          margin-bottom: 40px;
        }
        .page-header h1 {
          margin: 0 0 8px;
          font-size: 32px;
          color: #1F2937;
        }
        .page-header p {
          margin: 0;
          color: #666;
          font-size: 16px;
        }

        .doc-options {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 40px;
        }

        .doc-option {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 24px;
          background: white;
          border: 2px solid #eee;
          border-radius: 16px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
        }
        .doc-option:hover {
          border-color: #2dd4a8;
          transform: translateX(4px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .doc-icon {
          font-size: 40px;
          width: 60px;
          text-align: center;
        }

        .doc-content {
          flex: 1;
        }
        .doc-content h3 {
          margin: 0 0 4px;
          font-size: 18px;
          color: #1F2937;
        }
        .doc-desc {
          margin: 0 0 8px;
          font-size: 14px;
          color: #333;
        }
        .doc-details {
          margin: 0;
          font-size: 13px;
          color: #888;
        }

        .arrow {
          font-size: 24px;
          color: #2dd4a8;
        }

        .help-box {
          background: #f0f9f6;
          border-radius: 16px;
          padding: 24px;
          text-align: center;
        }
        .help-box h4 {
          margin: 0 0 12px;
          color: #1F2937;
        }
        .help-box p {
          margin: 0 0 16px;
          font-size: 14px;
          color: #555;
          line-height: 1.8;
          text-align: left;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }
        .help-box button {
          background: #1F2937;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }
      `}</style>
    </AppLayout>
  );
}