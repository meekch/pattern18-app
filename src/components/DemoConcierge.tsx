'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'concierge' | 'user';
  content: string;
  visible?: boolean;
}

interface LeadData {
  treatment_interest: string;
  prior_experience: string;
  timeline: string;
  name: string;
  phone: string;
  email: string;
}

type Step = 'treatment' | 'experience' | 'experience_ack' | 'timeline' | 'contact' | 'submitting' | 'complete';

export default function DemoConcierge() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [step, setStep] = useState<Step>('treatment');
  const [lead, setLead] = useState<Partial<LeadData>>({});
  const [waiting, setWaiting] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
  const [formError, setFormError] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  const [utmData] = useState(() => {
    if (typeof window === 'undefined') return {};
    const data: Record<string, string> = {};
    const src = sessionStorage.getItem('utm_source');
    const med = sessionStorage.getItem('utm_medium');
    const camp = sessionStorage.getItem('utm_campaign');
    const ref = sessionStorage.getItem('referrer');
    if (src) data.utm_source = src;
    if (med) data.utm_medium = med;
    if (camp) data.utm_campaign = camp;
    if (ref) data.referrer = ref;
    return data;
  });

  const scrollToBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const addConciergeMessage = (content: string, delay = 700): Promise<void> => {
    return new Promise((resolve) => {
      setWaiting(true);
      scrollToBottom();
      setTimeout(() => {
        setWaiting(false);
        setMessages(prev => [...prev, { role: 'concierge', content, visible: false }]);
        setTimeout(() => {
          setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, visible: true } : m));
          scrollToBottom();
          resolve();
        }, 30);
      }, delay);
    });
  };

  const addUserMessage = (content: string) => {
    setMessages(prev => [...prev, { role: 'user', content, visible: true }]);
    scrollToBottom();
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    addConciergeMessage(
      "Welcome to Luméa Medical Aesthetics. I'll be happy to assist you in arranging a personalized consultation.\n\nMay I ask which treatment you're most interested in?",
      800
    );
  }, []);

  const handleTreatment = async (choice: string) => {
    addUserMessage(choice);
    setLead(prev => ({ ...prev, treatment_interest: choice }));
    if (choice === "I'm not sure — I'd love guidance") {
      await addConciergeMessage("No problem at all — your consultation will include a personalized assessment to find the best options for you.");
      await addConciergeMessage("When are you hoping to schedule your consultation?");
      setStep('timeline');
    } else {
      await addConciergeMessage("Have you had this treatment before?");
      setStep('experience');
    }
  };

  const handleExperience = async (choice: string) => {
    addUserMessage(choice);
    setLead(prev => ({ ...prev, prior_experience: choice }));
    const ack = choice === 'Yes'
      ? "Wonderful — we'll tailor your consultation based on your previous experience and current goals."
      : "Perfect — your consultation will include a personalized assessment to determine the best approach for your goals.";
    await addConciergeMessage(ack);
    setStep('experience_ack');
    await addConciergeMessage("When are you hoping to schedule your consultation?");
    setStep('timeline');
  };

  const handleTimeline = async (choice: string) => {
    addUserMessage(choice);
    setLead(prev => ({ ...prev, timeline: choice }));
    await addConciergeMessage("Wonderful. To complete your request, may I collect a few details?");
    setStep('contact');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim() || !formData.phone.trim() || !formData.email.trim()) {
      setFormError('All fields are required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setFormError('Please enter a valid email address.');
      return;
    }

    const fullLead = {
      ...lead,
      ...utmData,
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
    };

    setContactSubmitted(true);
    setStep('submitting');
    addUserMessage(`${fullLead.name}\n${fullLead.phone}\n${fullLead.email}`);

    try {
      const res = await fetch('/api/demo/submit-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullLead),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error('Lead submission error:', data);
        await addConciergeMessage("I'm sorry — something went wrong submitting your request. Please try again.");
        setStep('contact');
        setFormData({ name: '', phone: '', email: '' });
        return;
      }

      await addConciergeMessage(
        `Thank you, ${fullLead.name}. One of our specialists will reach out shortly to confirm your personalized consultation.\n\nA confirmation has been sent to ${fullLead.email}.`
      );
      setStep('complete');
    } catch (err) {
      console.error('Lead submission failed:', err);
      await addConciergeMessage("I'm sorry — there was a connection error. Please try again.");
      setStep('contact');
      setFormData({ name: '', phone: '', email: '' });
    }
  };

  const quickReplies: Record<string, { options: string[]; handler: (choice: string) => void }> = {
    treatment: {
      options: [
        'Botox / Injectables',
        'Dermal Fillers',
        'Laser Skin Resurfacing',
        'Body Contouring',
        "I'm not sure — I'd love guidance",
      ],
      handler: handleTreatment,
    },
    experience: {
      options: ['Yes', 'No'],
      handler: handleExperience,
    },
    timeline: {
      options: ['Within 1–2 weeks', 'Within a month', 'Exploring options'],
      handler: handleTimeline,
    },
  };

  const currentReplies = quickReplies[step];

  return (
    <div className="concierge">
      <div className="conversation">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.visible ? 'visible' : ''}`}>
            <div className={`block ${msg.role}`}>
              {msg.content.split('\n').map((line, j) => (
                <span key={j}>
                  {line}
                  {j < msg.content.split('\n').length - 1 && <br />}
                </span>
              ))}
            </div>
          </div>
        ))}

        {currentReplies && !waiting && (
          <div className="quick-replies">
            {currentReplies.options.map((opt) => (
              <button
                key={opt}
                className="quick-reply"
                onClick={() => currentReplies.handler(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {step === 'contact' && !contactSubmitted && !waiting && (
          <div className="contact-form-wrap">
            <form onSubmit={handleSubmit} className="contact-form">
              <input
                type="text"
                placeholder="Full name"
                value={formData.name}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              />
              <input
                type="tel"
                placeholder="Phone number"
                value={formData.phone}
                onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
              />
              <input
                type="email"
                placeholder="Email address"
                value={formData.email}
                onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
              />
              {formError && <p className="form-error">{formError}</p>}
              <button type="submit" className="submit-btn">
                Confirm Consultation Request
              </button>
            </form>
          </div>
        )}

        {step === 'submitting' && !waiting && (
          <div className="submitting">Submitting your request...</div>
        )}

        <div ref={bottomRef} />
      </div>

      <style jsx>{`
        .concierge {
          width: 100%;
          max-width: 660px;
          margin: 0 auto;
          padding: 0 20px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          overflow-y: auto;
        }
        .conversation {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 32px 0 40px;
        }
        .message {
          opacity: 0;
          transition: opacity 350ms ease-in-out;
        }
        .message.visible {
          opacity: 1;
        }
        .block {
          padding: 22px 26px;
          border-radius: 18px;
          font-size: 15px;
          line-height: 1.7;
          letter-spacing: 0.01em;
          font-weight: 400;
        }
        .block.concierge {
          background: #F3F1ED;
          color: #232323;
          border: 1px solid #E7E2DA;
        }
        .block.user {
          background: #EDEAE5;
          color: #232323;
          border: 1px solid #E7E2DA;
        }
        .quick-replies {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .quick-reply {
          padding: 12px 20px;
          background: #F7F6F3;
          border: 1px solid #E7E2DA;
          border-radius: 999px;
          font-size: 14px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-weight: 400;
          color: #232323;
          cursor: pointer;
          transition: background 0.2s ease-in-out;
          letter-spacing: 0.01em;
        }
        .quick-reply:hover {
          background: #EFECE6;
        }
        .contact-form-wrap {
          margin-top: 4px;
        }
        .contact-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: #F3F1ED;
          padding: 24px;
          border-radius: 14px;
          border: 1px solid #E7E2DA;
          max-width: 380px;
        }
        .contact-form input {
          padding: 14px 16px;
          border: 1px solid #E7E2DA;
          border-radius: 10px;
          font-size: 15px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #232323;
          background: #FFFFFF;
          outline: none;
          transition: border-color 0.2s;
        }
        .contact-form input:focus {
          border-color: #C7B8A3;
        }
        .contact-form input::placeholder {
          color: #9A948B;
        }
        .form-error {
          color: #B44;
          font-size: 13px;
          margin: 0;
        }
        .submit-btn {
          padding: 14px 24px;
          background: #C7B8A3;
          color: #FFFFFF;
          border: none;
          border-radius: 999px;
          font-size: 15px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s ease-in-out;
          letter-spacing: 0.02em;
        }
        .submit-btn:hover {
          background: #B7A48C;
        }
        .submitting {
          font-size: 14px;
          color: #5A5A5A;
          padding: 20px 0;
          font-style: italic;
        }
        @media (max-width: 480px) {
          .concierge {
            padding: 0 16px;
          }
          .block {
            font-size: 14px;
            padding: 18px 20px;
          }
        }
      `}</style>
    </div>
  );
}
