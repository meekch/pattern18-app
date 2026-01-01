'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function BetaFeedback() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'other'>('bug');
  const [message, setMessage] = useState('');
  const [currentPage, setCurrentPage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const openModal = () => {
    setCurrentPage(window.location.pathname);
    setIsOpen(true);
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;
    
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      await supabase.from('beta_feedback').insert({
        user_id: session?.user?.id || null,
        user_email: session?.user?.email || 'anonymous',
        feedback_type: feedbackType,
        message: message,
        page: currentPage,
        user_agent: navigator.userAgent,
        created_at: new Date().toISOString(),
      });

      setSent(true);
      setTimeout(() => {
        setIsOpen(false);
        setSent(false);
        setMessage('');
        setFeedbackType('bug');
      }, 2000);
    } catch (error) {
      console.error('Feedback error:', error);
      alert('Failed to send feedback. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button onClick={openModal} className="feedback-btn">
        💬 Feedback
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {sent ? (
              <div className="success">
                <div className="success-icon">✓</div>
                <h3>Thank you!</h3>
                <p>Your feedback helps us improve Pattern 18.</p>
              </div>
            ) : (
              <>
                <div className="modal-header">
                  <h3>Send Feedback</h3>
                  <button className="close-btn" onClick={() => setIsOpen(false)}>✕</button>
                </div>

                <div className="beta-notice">
                  <span className="beta-tag">BETA</span>
                  <p>Pattern 18 is actively being built. Your feedback shapes what we build next!</p>
                </div>

                <div className="form">
                  <div className="type-selector">
                    <button 
                      className={`type-btn ${feedbackType === 'bug' ? 'active' : ''}`}
                      onClick={() => setFeedbackType('bug')}
                    >
                      🐛 Bug
                    </button>
                    <button 
                      className={`type-btn ${feedbackType === 'feature' ? 'active' : ''}`}
                      onClick={() => setFeedbackType('feature')}
                    >
                      ✨ Feature Request
                    </button>
                    <button 
                      className={`type-btn ${feedbackType === 'other' ? 'active' : ''}`}
                      onClick={() => setFeedbackType('other')}
                    >
                      💭 Other
                    </button>
                  </div>

                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                      feedbackType === 'bug' 
                        ? "What happened? What did you expect?"
                        : feedbackType === 'feature'
                        ? "What would you like to see? How would it help you?"
                        : "What's on your mind?"
                    }
                    rows={4}
                  />

                  <p className="page-note">📍 Sending from: {currentPage}</p>

                  <button 
                    className="submit-btn"
                    onClick={handleSubmit}
                    disabled={!message.trim() || sending}
                  >
                    {sending ? 'Sending...' : 'Send Feedback'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .feedback-btn {
          position: fixed;
          bottom: 90px;
          right: 20px;
          background: #1a3a2f;
          color: white;
          border: none;
          padding: 12px 16px;
          border-radius: 24px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          z-index: 90;
          transition: transform 0.2s;
        }
        .feedback-btn:hover {
          transform: scale(1.05);
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 300;
          padding: 20px;
        }
        .modal {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 420px;
          max-height: 90vh;
          overflow-y: auto;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 20px 0;
        }
        .modal-header h3 {
          margin: 0;
          color: #1a3a2f;
          font-size: 20px;
        }
        .close-btn {
          background: #f3f4f6;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 16px;
          cursor: pointer;
          font-size: 16px;
          color: #6b7280;
        }
        .beta-notice {
          margin: 16px 20px;
          padding: 12px 16px;
          background: #fefce8;
          border: 1px solid #fef08a;
          border-radius: 12px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .beta-tag {
          background: #f59e0b;
          color: white;
          font-size: 10px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 4px;
          flex-shrink: 0;
        }
        .beta-notice p {
          margin: 0;
          font-size: 13px;
          color: #854d0e;
          line-height: 1.4;
        }
        .form {
          padding: 0 20px 20px;
        }
        .type-selector {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }
        .type-btn {
          flex: 1;
          padding: 10px 8px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .type-btn.active {
          border-color: #1a3a2f;
          background: #f0fdf4;
        }
        textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 15px;
          resize: vertical;
          font-family: inherit;
          margin-bottom: 12px;
        }
        textarea:focus {
          outline: none;
          border-color: #1a3a2f;
        }
        .page-note {
          font-size: 12px;
          color: #9ca3af;
          margin: 0 0 16px;
        }
        .submit-btn {
          width: 100%;
          padding: 14px;
          background: #1a3a2f;
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
        }
        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .success {
          padding: 48px 20px;
          text-align: center;
        }
        .success-icon {
          width: 64px;
          height: 64px;
          background: #d1fae5;
          color: #059669;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          margin: 0 auto 16px;
        }
        .success h3 {
          margin: 0 0 8px;
          color: #1a3a2f;
        }
        .success p {
          margin: 0;
          color: #6b7280;
        }
      `}</style>
    </>
  );
}