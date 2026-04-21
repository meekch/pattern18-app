'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface FeedbackModalProps {
  userId: string
  conversationId: string | null
  onClose: () => void
}

type FeedbackType = 'general' | 'feature_request' | 'prompt_suggestion'

export default function FeedbackModal({ userId, conversationId, onClose }: FeedbackModalProps) {
  const [type, setType] = useState<FeedbackType>('general')
  const [text, setText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!text.trim()) return
    setLoading(true)

    const { error } = await supabase.from('feedback').insert({
      user_id: userId,
      type: type,
      feedback_text: text,
      conversation_id: conversationId,
    })

    setLoading(false)
    if (!error) {
      setSubmitted(true)
    }
  }

  const typeOptions = [
    { id: 'general', icon: '💬', label: 'General Feedback', placeholder: 'What\'s working well? What could be better?' },
    { id: 'feature_request', icon: '✨', label: 'Feature Request', placeholder: 'What would make Pattern18 even more helpful for you?' },
    { id: 'prompt_suggestion', icon: '💡', label: 'Prompt Idea', placeholder: 'Share a prompt that helped you — we might add it to the gallery!' },
  ]

  const currentOption = typeOptions.find(o => o.id === type)!

  return (
    <div className="feedback-overlay">
      <div className="feedback-modal">
        {submitted ? (
          <div className="success-view">
            <div className="success-icon"></div>
            <h2>Thank you!</h2>
            <p>Your feedback helps us make Pattern18 better for everyone walking this path.</p>
            <button onClick={onClose} className="close-btn">Done</button>
          </div>
        ) : (
          <>
            <div className="modal-header">
              <h2>Share Your Thoughts</h2>
              <button onClick={onClose} className="x-btn">✕</button>
            </div>
            <p className="modal-subtitle">Your feedback shapes how we grow. Everything you share is private.</p>

            <div className="type-selector">
              {typeOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => setType(option.id as FeedbackType)}
                  className={`type-btn ${type === option.id ? 'active' : ''}`}
                >
                  <span className="type-icon">{option.icon}</span>
                  <span className="type-label">{option.label}</span>
                </button>
              ))}
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={currentOption.placeholder}
              className="feedback-input"
              rows={5}
            />

            <button
              onClick={handleSubmit}
              disabled={!text.trim() || loading}
              className="submit-btn"
            >
              {loading ? 'Sending...' : 'Send Feedback'}
            </button>

            <p className="privacy-note">
              🔒 Your feedback is private and only used to improve Pattern18.
            </p>
          </>
        )}
      </div>

      <style jsx>{`
        .feedback-overlay {
          position: fixed;
          inset: 0;
          background: rgba(13, 31, 24, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          backdrop-filter: blur(4px);
        }

        .feedback-modal {
          background: white;
          border-radius: 24px;
          max-width: 480px;
          width: 100%;
          padding: 32px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.3);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .modal-header h2 {
          font-size: 24px;
          color: #1F2937;
          margin: 0;
        }

        .x-btn {
          background: #f5f5f5;
          border: none;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          font-size: 18px;
          cursor: pointer;
          color: #666;
          transition: all 0.2s;
        }

        .x-btn:hover {
          background: #eee;
          color: #333;
        }

        .modal-subtitle {
          color: #666;
          font-size: 15px;
          margin: 0 0 24px 0;
          line-height: 1.5;
        }

        .type-selector {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        .type-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 14px 10px;
          background: #f8faf9;
          border: 2px solid transparent;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .type-btn:hover {
          background: #EAF5F3;
        }

        .type-btn.active {
          background: #EAF5F3;
          border-color: #2dd4a8;
        }

        .type-icon {
          font-size: 24px;
        }

        .type-label {
          font-size: 12px;
          font-weight: 600;
          color: #1F2937;
          text-align: center;
        }

        .feedback-input {
          width: 100%;
          padding: 16px;
          border: 2px solid #e8e8e8;
          border-radius: 14px;
          font-size: 15px;
          font-family: inherit;
          line-height: 1.6;
          resize: none;
          box-sizing: border-box;
          transition: border-color 0.2s;
          margin-bottom: 16px;
        }

        .feedback-input:focus {
          outline: none;
          border-color: #2dd4a8;
        }

        .submit-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #1F2937 0%, #1A5F5A 100%);
          color: white;
          border: none;
          border-radius: 14px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(26, 58, 47, 0.25);
        }

        .submit-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .privacy-note {
          text-align: center;
          font-size: 13px;
          color: #999;
          margin: 16px 0 0 0;
        }

        .success-view {
          text-align: center;
          padding: 20px 0;
        }

        .success-icon {
          font-size: 64px;
          margin-bottom: 20px;
        }

        .success-view h2 {
          font-size: 26px;
          color: #1F2937;
          margin: 0 0 12px 0;
        }

        .success-view p {
          color: #666;
          font-size: 16px;
          line-height: 1.6;
          margin: 0 0 28px 0;
        }

        .close-btn {
          padding: 16px 48px;
          background: linear-gradient(135deg, #1F2937 0%, #1A5F5A 100%);
          color: white;
          border: none;
          border-radius: 14px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .close-btn:hover {
          transform: translateY(-2px);
        }

        @media (max-width: 500px) {
          .feedback-modal {
            padding: 24px;
          }

          .type-selector {
            flex-direction: column;
          }

          .type-btn {
            flex-direction: row;
            justify-content: flex-start;
            padding: 12px 16px;
          }

          .type-icon {
            font-size: 20px;
          }

          .type-label {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  )
}