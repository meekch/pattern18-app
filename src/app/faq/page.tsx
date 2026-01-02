"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
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
    answer: "Go to My Case, check the incidents you want to include, then tap 'Generate Exhibit' or 'Create Document'. Pattern 18 will create a professional Word document with your evidence formatted for court submission — complete with pattern analysis, timeline, and exact quotes."
  },
  {
    question: "Can I upload my custody orders?",
    answer: "Yes! Go to the Docs tab to upload your custody orders, parenting plans, or other court documents. Pattern 18 can reference your specific orders when helping you respond to situations or identify violations. Your documents are stored securely and only accessible to you."
  },
  {
    question: "Can I share my case with my attorney?",
    answer: "Yes. You can export your entire case file or generate specific documents to share with your attorney. Many users find it helpful to share the Court Exhibit Packet — it gives attorneys a clear, organized view of documented patterns."
  },
  {
    question: "Can my attorney use this?",
    answer: "Pattern 18 Pro is in beta for family law attorneys. If your lawyer works with high-conflict custody cases, they can request early access at pro@pattern18.com.\n\nEarly adopters can become Pattern 18 Certified — listed in our directory as attorneys who understand coercive control and evidence-based documentation."
  },
  {
    question: "Is my information private and secure?",
    answer: "Absolutely. Your privacy is our top priority. All data is encrypted and stored securely. We never share your information with third parties. Your co-parent cannot access your account or see what you've documented. You can delete your data at any time. We understand the sensitivity of custody situations and have built Pattern 18 with your safety in mind."
  },
  {
    question: "How is this different from ChatGPT or other AI?",
    answer: "Pattern 18 Coach is specifically designed for high-conflict co-parenting situations. Unlike general AI, it understands custody dynamics, court expectations, manipulation tactics, and the emotional toll of these situations. It won't give generic advice — it gives you strategic, court-aware guidance built by someone who has lived this experience for 15 years."
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
    answer: "No. Pattern 18 Coach provides support, documentation help, and communication strategies, but it is not a substitute for legal advice. Always consult with a qualified family law attorney for legal decisions. Think of Pattern 18 as a knowledgeable ally who helps you prepare and organize — your attorney makes the legal calls."
  },
  {
    question: "Can I use this on my phone?",
    answer: "Yes! Pattern 18 works on any device with a web browser — phone, tablet, or computer. For the best mobile experience, add it to your home screen: in Safari tap Share then 'Add to Home Screen', or in Chrome tap the menu then 'Add to Home Screen'. It works just like a native app."
  }
];

export default function FAQPage() {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

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

      <div className="faq-container">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className={`faq-item ${openIndex === index ? 'open' : ''}`}
          >
            <button
              className="faq-question"
              onClick={() => toggleFAQ(index)}
            >
              <span>{faq.question}</span>
              <span className="faq-icon">{openIndex === index ? '−' : '+'}</span>
            </button>
            {openIndex === index && (
              <div className="faq-answer">
                {faq.answer.split('\n\n').map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            )}
          </div>
        ))}
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

        .faq-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 32px 24px 80px;
        }

        .faq-item {
          background: white;
          border-radius: 12px;
          margin-bottom: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          overflow: hidden;
          transition: box-shadow 0.2s;
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

          .faq-container {
            padding: 24px 16px 60px;
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