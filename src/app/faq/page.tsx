"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface FAQItem {
  question: string;
  answer: string;
  category?: string;
}

const faqs: FAQItem[] = [
  // HOW IT WORKS - NEW SECTION
  {
    question: "How does Pattern 18 work?",
    answer: "Pattern 18 has two main modes:\n\n**In the Moment (Coach)**\nJust got a text that made your stomach drop? Open Coach, upload the screenshot or paste the message. AI identifies the manipulation patterns instantly, gives you response options that won't take the bait, and saves it to your evidence with one tap.\n\n**Building Your Case (Evidence + Documents)**\nGo to Evidence to review everything you've documented. Filter by pattern, edit severity, mark items for your exhibit. When you're ready for court, select the incidents you need and generate a professional Word document with exact quotes, dates, and pattern analysis.",
    category: "getting-started"
  },
  {
    question: "How do I bulk import my text messages?",
    answer: "For thorough documentation, export your entire text history and let Pattern 18 analyze it all at once.\n\n**How to export texts from your phone:**\n\n• **iMazing** (iPhone, $50 one-time) - Easiest. Connect phone, select Messages, export as CSV\n• **Dr.Fone** (iPhone/Android, $50/year) - Similar process, works on both platforms\n• **SMS Backup & Restore** (Android, free) - Backs up to CSV automatically\n• **iTunes backup + iExplorer** (iPhone, free-ish) - More technical but works\n\n**To import:**\nGo to Coach → Import Message History (or Menu → Bulk Import). Upload your CSV file. Pattern 18 analyzes the entire thread, identifies patterns, and saves incidents automatically.\n\n**Pro tip:** Export weekly or monthly to keep your documentation current. Always do a fresh export before any court date.",
    category: "getting-started"
  },
  {
    question: "How often should I document?",
    answer: "**In the moment:** Every time you get a message that feels manipulative, upload it to Coach immediately. Takes 30 seconds. Don't wait.\n\n**Bulk imports:** Weekly is ideal. Monthly minimum. This catches anything you missed in the moment.\n\n**Before court:** Always do a fresh export 1-2 weeks before any hearing. Review your evidence, mark the strongest incidents for your exhibit, generate your documents.\n\n**The pattern matters:** Courts don't act on one incident. They act on documented patterns over time. Consistency is your evidence.",
    category: "getting-started"
  },
  {
    question: "What's the difference between Coach, Evidence, and Documents?",
    answer: "**Coach** - Your 24/7 support. Upload screenshots, get pattern analysis, draft responses, document in the moment. This is where evidence gets created.\n\n**Evidence** - Your case file. Everything you've documented lives here. Filter by pattern, severity, or date. Edit details. Mark items for your court exhibit. This is where you organize and prepare.\n\n**Documents** - Generate court-ready files. Select incidents from Evidence, choose document type (Exhibit Packet or Declaration), download a professional Word doc. This is where preparation becomes presentation.",
    category: "getting-started"
  },
  // ORIGINAL FAQs - UPDATED
  {
    question: "What can Pattern 18 Coach do for me?",
    answer: "Pattern 18 Coach helps you navigate high-conflict co-parenting by: analyzing messages from your co-parent to identify manipulation patterns, helping you draft calm and court-appropriate responses, automatically documenting incidents to your case file, creating evidence packets for your attorney, and providing strategic support 24/7."
  },
  {
    question: "Why 'Pattern 18'?",
    answer: "Eighteen is when the court orders end. When your child can choose. When you can finally plan a vacation, a holiday, a birthday — without someone weaponizing the system to destroy it.\n\nPattern 18 was built by someone 15 years into this fight, with 3 to go. It took years to understand what was happening — years lost in confusion, thousands of dollars, endless energy fighting something I didn't even know had a name.\n\nIf I had known what to look for, I could have spotted it, believed myself, and documented it from day one.\n\nThat's why this exists. So you don't lose years. So you see it clearly. So when you walk into court, you have evidence — not just your word against theirs.\n\nWe're not waiting for freedom. We're building it."
  },
  {
    question: "How do I document an incident?",
    answer: "Just paste the message or upload a screenshot in Coach. Pattern 18 automatically analyzes it, identifies manipulation patterns, and saves it to your case file. You'll see a confirmation when it's saved. That's it — no extra steps."
  },
  {
    question: "How do I create a court document?",
    answer: "Go to Evidence, check the incidents you want to include, then tap 'Generate Exhibit'. Pattern 18 will create a professional Word document with your evidence formatted for court submission — complete with pattern analysis, timeline, and exact quotes.\n\nYou can also go to Documents to create declarations, timelines, or pattern summaries using the AI Declaration Writer."
  },
  {
    question: "Can I upload my custody orders?",
    answer: "Yes! Go to the Documents tab → Court Orders to upload your custody orders, parenting plans, or other court documents. Pattern 18 can reference your specific orders when helping you respond to situations or identify violations. Your documents are stored securely and only accessible to you."
  },
  {
    question: "Can I share my case with my attorney?",
    answer: "Yes. You can export your entire case file or generate specific documents to share with your attorney. Many users find it helpful to share the Court Exhibit Packet — it gives attorneys a clear, organized view of documented patterns with exact quotes and dates."
  },
  {
    question: "Can my attorney use this?",
    answer: "Pattern 18 Pro is available for family law attorneys. If your lawyer works with high-conflict custody cases, they can request access at pro@pattern18.com.\n\nFirms can become Pattern 18 Certified — listed in our directory as attorneys who understand coercive control and evidence-based documentation."
  },
  {
    question: "Is my information private and secure?",
    answer: "Absolutely. Your privacy is our top priority. All data is encrypted and stored securely. We never share your information with third parties. Your co-parent cannot access your account or see what you've documented. You can delete your data at any time. We understand the sensitivity of custody situations and have built Pattern 18 with your safety in mind."
  },
  {
    question: "How is this different from ChatGPT or other AI?",
    answer: "Pattern 18 Coach is specifically designed for high-conflict co-parenting situations. Unlike general AI, it understands custody dynamics, court expectations, manipulation tactics, and the emotional toll of these situations. It won't give generic advice — it gives you strategic, court-aware guidance built by someone who has lived this experience for 15 years.\n\nIt also automatically saves and organizes your evidence, tracks patterns over time, and generates court-ready documents. ChatGPT can't do any of that."
  },
  {
    question: "What manipulation patterns does it detect?",
    answer: "Pattern 18 identifies 18 coercive control tactics recognized in family court:\n\n• Gaslighting\n• DARVO (Deny, Attack, Reverse Victim & Offender)\n• Intimidation & Threats\n• Financial Abuse\n• Using Children as Weapons\n• Blame-Shifting\n• False Accusations\n• Emotional Blackmail\n• Stonewalling\n• Monitoring/Stalking\n• Isolation Tactics\n• Minimizing/Denying\n• Word Salad\n• Moving Goalposts\n• Projection\n• Hoovering\n• Gatekeeping\n• Legal/Court Threats\n\nEach pattern is explained so you understand what's happening and can articulate it clearly to your attorney or the court."
  },
  {
    question: "How do I cancel my subscription?",
    answer: "You can cancel anytime from your account settings. Your access continues until the end of your billing period. No questions asked, no hoops to jump through.\n\nImportant: When you cancel, your data is permanently deleted from our servers after 30 days. We do not retain your personal case information. If you need your records, please export your case file before canceling."
  },
  {
    question: "I forgot my password. How do I reset it?",
    answer: "On the login page, click 'Forgot password?' and enter your email. You'll receive an email with a link to reset your password. If you don't see the email, check your spam folder."
  },
  {
    question: "Does Pattern 18 Coach give legal advice?",
    answer: "No. Pattern 18 Coach provides support, documentation help, and communication strategies, but it is not a substitute for legal advice. Always consult with a qualified family law attorney for legal decisions. Think of Pattern 18 as a knowledgeable ally who helps you prepare and organize — your attorney makes the legal calls.\n\nDocuments generated by Pattern 18 are starting points and should be reviewed by legal counsel before submitting to court."
  },
  {
    question: "Can I use this on my phone?",
    answer: "Yes! Pattern 18 works on any device with a web browser — phone, tablet, or computer. For the best mobile experience, add it to your home screen: in Safari tap Share then 'Add to Home Screen', or in Chrome tap the menu then 'Add to Home Screen'. It works just like a native app."
  }
];

export default function FAQPage() {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(0); // Start with first one open
  const [filter, setFilter] = useState<'all' | 'getting-started'>('all');

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const filteredFaqs = filter === 'all' 
    ? faqs 
    : faqs.filter(f => f.category === 'getting-started');

  const gettingStartedCount = faqs.filter(f => f.category === 'getting-started').length;

  return (
    <div className="faq-page">
      <header className="header">
        <div className="header-content">
          <button onClick={() => router.push("/coach")} className="back-btn">
            ← Back
          </button>
          <div className="logo">
            <span className="logo-icon">💚</span>
            <span className="logo-text">Pattern 18</span>
          </div>
        </div>
      </header>

      <div className="hero">
        <h1>Help & FAQ</h1>
        <p>Everything you need to know about Pattern 18</p>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button 
          className={`filter-tab ${filter === 'getting-started' ? 'active' : ''}`}
          onClick={() => setFilter('getting-started')}
        >
          🚀 How It Works ({gettingStartedCount})
        </button>
        <button 
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Questions ({faqs.length})
        </button>
      </div>

      <div className="faq-container">
        {filteredFaqs.map((faq, index) => {
          const actualIndex = faqs.indexOf(faq);
          return (
            <div
              key={actualIndex}
              className={`faq-item ${openIndex === actualIndex ? 'open' : ''} ${faq.category === 'getting-started' ? 'getting-started' : ''}`}
            >
              <button
                className="faq-question"
                onClick={() => toggleFAQ(actualIndex)}
              >
                <span>{faq.question}</span>
                <span className="faq-icon">{openIndex === actualIndex ? '−' : '+'}</span>
              </button>
              {openIndex === actualIndex && (
                <div className="faq-answer">
                  {faq.answer.split('\n\n').map((paragraph, i) => (
                    <p key={i} dangerouslySetInnerHTML={{ 
                      __html: paragraph
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\n/g, '<br/>')
                    }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="contact-section">
        <h2>Still have questions?</h2>
        <p>We're here to help.</p>
        <a href="mailto:support@pattern18.com" className="contact-btn">
          Contact Support
        </a>
      </div>

      <style jsx>{`
        .faq-page {
          min-height: 100vh;
          background: linear-gradient(180deg, #f8faf9 0%, #ffffff 100%);
          overflow-y: auto;
        }

        .header {
          background: white;
          border-bottom: 1px solid #e0e0e0;
          padding: 16px 24px;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-content {
          max-width: 800px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .back-btn {
          background: none;
          border: none;
          color: #1a3a2f;
          font-size: 14px;
          cursor: pointer;
          padding: 8px 0;
        }

        .back-btn:hover {
          color: #2d5a4a;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .logo-icon {
          font-size: 24px;
        }

        .logo-text {
          font-size: 18px;
          font-weight: 700;
          color: #1a3a2f;
        }

        .hero {
          text-align: center;
          padding: 48px 24px 32px;
          background: linear-gradient(135deg, #1a3a2f 0%, #2d5a4a 100%);
          color: white;
        }

        .hero h1 {
          font-size: 28px;
          margin: 0 0 8px;
          font-weight: 700;
        }

        .hero p {
          font-size: 15px;
          opacity: 0.9;
          margin: 0;
        }

        .filter-tabs {
          display: flex;
          gap: 8px;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px 24px 0;
        }

        .filter-tab {
          padding: 10px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 20px;
          background: white;
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-tab:hover {
          border-color: #1a3a2f;
        }

        .filter-tab.active {
          background: #1a3a2f;
          border-color: #1a3a2f;
          color: white;
        }

        .faq-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px 24px 80px;
        }

        .faq-item {
          background: white;
          border-radius: 12px;
          margin-bottom: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          overflow: hidden;
          transition: box-shadow 0.2s;
        }

        .faq-item.getting-started {
          border-left: 4px solid #059669;
        }

        .faq-item:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        }

        .faq-item.open {
          box-shadow: 0 4px 20px rgba(26, 58, 47, 0.15);
        }

        .faq-question {
          width: 100%;
          padding: 18px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 15px;
          font-weight: 600;
          color: #1a3a2f;
          text-align: left;
          gap: 16px;
        }

        .faq-icon {
          font-size: 24px;
          color: #2dd4a8;
          flex-shrink: 0;
        }

        .faq-answer {
          padding: 0 20px 18px;
          color: #555;
          line-height: 1.7;
          font-size: 14px;
          border-top: 1px solid #f0f0f0;
          padding-top: 14px;
          margin-top: -4px;
        }

        .faq-answer p {
          margin: 0 0 12px;
        }

        .faq-answer p:last-child {
          margin-bottom: 0;
        }

        .faq-answer :global(strong) {
          color: #1a3a2f;
          font-weight: 600;
        }

        .contact-section {
          text-align: center;
          padding: 48px 24px;
          background: #f8faf9;
          border-top: 1px solid #e8ebe9;
        }

        .contact-section h2 {
          font-size: 22px;
          color: #1a3a2f;
          margin: 0 0 8px;
        }

        .contact-section p {
          color: #666;
          margin: 0 0 20px;
        }

        .contact-btn {
          display: inline-block;
          padding: 12px 28px;
          background: linear-gradient(135deg, #1a3a2f 0%, #2d5a4a 100%);
          color: white;
          text-decoration: none;
          border-radius: 24px;
          font-weight: 600;
          font-size: 14px;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .contact-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(26, 58, 47, 0.3);
        }

        @media (max-width: 640px) {
          .hero {
            padding: 36px 20px 28px;
          }

          .hero h1 {
            font-size: 24px;
          }

          .filter-tabs {
            padding: 16px 16px 0;
          }

          .filter-tab {
            padding: 8px 12px;
            font-size: 12px;
          }

          .faq-container {
            padding: 16px 16px 60px;
          }

          .faq-question {
            padding: 16px;
            font-size: 14px;
          }

          .faq-answer {
            padding: 0 16px 14px;
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}