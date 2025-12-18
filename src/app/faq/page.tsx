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
    answer: "Pattern 18 Coach helps you navigate high-conflict co-parenting by: analyzing messages from your co-parent to identify manipulation patterns, helping you draft calm and court-appropriate responses, documenting incidents for your records, creating communication logs and summaries for your attorney, and providing emotional support and validation 24/7."
  },
  {
    question: "Why 'Pattern 18'?",
    answer: "Eighteen is when the court orders end. When your child can choose. When you can finally plan a vacation, a holiday, a birthday — without someone weaponizing the system to destroy it.\n\nPattern 18 was built by someone 16 years into this fight, with 2 to go. It took years to understand what was happening — years lost in confusion, thousands of dollars, endless energy fighting something I didn't even know had a name.\n\nIf I had known what to look for, I could have spotted it, believed myself, and documented it from day one.\n\nThat's why this exists. So you don't lose years. So you see it clearly. So when you walk into court, you have evidence — not just your word against theirs.\n\nWe're not waiting for freedom. We're building it."
  },
  {
    question: "How do I create a document?",
    answer: "To create a document, simply describe what you need in the chat. For example: 'Help me document the incident from yesterday when pickup was delayed' or 'Create a summary of this month's communication issues.' The coach will help you write clear, factual documentation suitable for court or your attorney."
  },
  {
    question: "Can I upload my custody orders?",
    answer: "Yes! Click the paperclip icon in the chat input to upload your custody orders, parenting plans, or other court documents. Pattern 18 Coach can reference your specific orders when helping you respond to situations or identify violations. Your documents are stored securely and only accessible to you."
  },
  {
    question: "Can I share conversations with my attorney?",
    answer: "Yes. You can copy any conversation or document from the chat to share with your attorney. You can also save incidents to your Evidence Dashboard and export them. Many users find it helpful to share incident documentation and communication summaries with their legal team."
  },
  {
    question: "Is my information private and secure?",
    answer: "Absolutely. Your privacy is our top priority. All conversations are encrypted and stored securely. We never share your information with third parties. Your co-parent cannot access your account or see what you've discussed. You can delete your data at any time. We understand the sensitivity of custody situations and have built Pattern 18 with your safety in mind."
  },
  {
    question: "How is this different from ChatGPT or other AI?",
    answer: "Pattern 18 Coach is specifically designed for high-conflict co-parenting situations. Unlike general AI, it understands custody dynamics, court expectations, manipulation tactics, and the emotional toll of these situations. It won't give generic advice — it gives you strategic, court-aware guidance built by someone who has lived this experience for 16 years."
  },
  {
    question: "How do I cancel my subscription?",
    answer: "You can cancel anytime from the menu — click 'Manage Subscription' to access the customer portal. Your access continues until the end of your billing period. No questions asked, no hoops to jump through.\n\nImportant: When you cancel, your conversations, documents, and evidence are permanently deleted from our servers. We do not retain your personal case information after cancellation. If you need your records, please export your Evidence Dashboard before canceling."
  },
  {
    question: "I forgot my password. How do I reset it?",
    answer: "On the login page, click 'Forgot password?' and enter your email. You'll receive an email with a link to reset your password. If you don't see the email, check your spam folder."
  },
  {
    question: "I'm in crisis or feeling unsafe. What should I do?",
    answer: "If you're in immediate danger, call 911. For support, click the 🤍 Safety Resources in the menu to access the National Domestic Violence Hotline (1-800-799-7233), Crisis Text Line (text HELLO to 741741), and online chat support. You are not alone, and help is available."
  },
  {
    question: "Does Pattern 18 Coach give legal advice?",
    answer: "No. Pattern 18 Coach provides support, documentation help, and communication strategies, but it is not a substitute for legal advice. Always consult with a qualified family law attorney for legal decisions. Think of the coach as a knowledgeable ally who helps you prepare and organize — your attorney makes the legal calls."
  },
  {
    question: "Can I use this on my phone?",
    answer: "Yes! Pattern 18 Coach works on any device with a web browser — phone, tablet, or computer. For the best mobile experience, add it to your home screen: in Safari tap Share then 'Add to Home Screen', or in Chrome tap the menu then 'Add to Home Screen'. It works just like a native app."
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
            ← Back to Coach
          </button>
          <div className="logo">
            <span className="logo-icon">💚</span>
            <span className="logo-text">Pattern 18</span>
          </div>
        </div>
      </header>

      <div className="hero">
        <h1>Frequently Asked Questions</h1>
        <p>Everything you need to know about Pattern 18 Coach</p>
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
        <p>We're here to help. Reach out anytime.</p>
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
          padding: 60px 24px 40px;
          background: linear-gradient(135deg, #1a3a2f 0%, #2d5a4a 100%);
          color: white;
        }

        .hero h1 {
          font-size: 32px;
          margin: 0 0 12px;
          font-weight: 700;
        }

        .hero p {
          font-size: 16px;
          opacity: 0.9;
          margin: 0;
        }

        .faq-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 24px 80px;
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
          padding: 20px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
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
          padding: 0 24px 20px;
          color: #555;
          line-height: 1.7;
          font-size: 15px;
          border-top: 1px solid #f0f0f0;
          padding-top: 16px;
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
          padding: 60px 24px;
          background: #f8faf9;
          border-top: 1px solid #e8ebe9;
        }

        .contact-section h2 {
          font-size: 24px;
          color: #1a3a2f;
          margin: 0 0 8px;
        }

        .contact-section p {
          color: #666;
          margin: 0 0 24px;
        }

        .contact-btn {
          display: inline-block;
          padding: 14px 32px;
          background: linear-gradient(135deg, #1a3a2f 0%, #2d5a4a 100%);
          color: white;
          text-decoration: none;
          border-radius: 30px;
          font-weight: 600;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .contact-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(26, 58, 47, 0.3);
        }

        @media (max-width: 640px) {
          .hero {
            padding: 40px 20px 30px;
          }

          .hero h1 {
            font-size: 26px;
          }

          .faq-container {
            padding: 24px 16px 60px;
          }

          .faq-question {
            padding: 16px 20px;
            font-size: 15px;
          }

          .faq-answer {
            padding: 0 20px 16px;
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}