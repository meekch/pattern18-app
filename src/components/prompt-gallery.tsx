'use client'

import { useState } from 'react'

interface PromptGalleryProps {
  onSelectPrompt: (prompt: string) => void
  onClose: () => void
}

interface PromptCategory {
  id: string
  icon: string
  title: string
  description: string
  prompts: {
    title: string
    prompt: string
    tags?: string[]
  }[]
}

const categories: PromptCategory[] = [
  {
    id: 'crisis',
    icon: '🚨',
    title: 'Crisis Mode',
    description: 'When you just got a message that made your stomach drop',
    prompts: [
      {
        title: 'Analyze a hostile message',
        prompt: 'I just got this message and I\'m spiraling. Can you help me understand what\'s happening and how to respond? Here\'s what they said:',
        tags: ['urgent', 'messages']
      },
      {
        title: 'Should I respond?',
        prompt: 'They just sent me this. I want to fire back but I know I shouldn\'t. Help me decide if I should respond at all, and if so, what to say:',
        tags: ['strategy', 'messages']
      },
      {
        title: 'They\'re threatening me',
        prompt: 'I just received a threatening message. I\'m scared and don\'t know what to do. Here\'s what they said:',
        tags: ['urgent', 'safety']
      },
      {
        title: 'Emergency schedule change',
        prompt: 'They\'re demanding I change the schedule last minute and threatening consequences if I don\'t. What should I do?',
        tags: ['schedule', 'boundaries']
      }
    ]
  },
  {
    id: 'messages',
    icon: '💬',
    title: 'Message Help',
    description: 'Craft responses that protect you and document patterns',
    prompts: [
      {
        title: 'Write a BIFF response',
        prompt: 'Help me write a BIFF response (Brief, Informative, Friendly, Firm) to this message:',
        tags: ['communication', 'strategy']
      },
      {
        title: 'Decode manipulation',
        prompt: 'Can you analyze this message for manipulation tactics? I feel like something is off but I can\'t put my finger on it:',
        tags: ['patterns', 'awareness']
      },
      {
        title: 'Set a boundary',
        prompt: 'I need to set a boundary about [topic]. Help me communicate it clearly without giving them ammunition:',
        tags: ['boundaries', 'communication']
      },
      {
        title: 'Respond to false accusations',
        prompt: 'They\'re accusing me of something I didn\'t do. How do I respond without being defensive or engaging in their narrative?',
        tags: ['strategy', 'documentation']
      },
      {
        title: 'Gray rock response',
        prompt: 'Help me craft a boring, gray rock response to this attempt to engage me emotionally:',
        tags: ['strategy', 'boundaries']
      }
    ]
  },
  {
    id: 'patterns',
    icon: '🔍',
    title: 'Pattern Recognition',
    description: 'Understand the tactics being used against you',
    prompts: [
      {
        title: 'Identify the pattern',
        prompt: 'This keeps happening and I\'m confused. Can you help me identify what pattern this is? Here\'s what\'s going on:',
        tags: ['awareness', 'validation']
      },
      {
        title: 'Is this gaslighting?',
        prompt: 'They\'re telling me I\'m remembering things wrong. Am I crazy or is this gaslighting? Here\'s what happened:',
        tags: ['gaslighting', 'validation']
      },
      {
        title: 'DARVO check',
        prompt: 'Every time I bring up a concern, somehow I end up apologizing. Is this DARVO? Here\'s a recent example:',
        tags: ['DARVO', 'patterns']
      },
      {
        title: 'Document a pattern',
        prompt: 'I\'ve noticed they always [behavior] when [trigger]. Help me document this pattern for court.',
        tags: ['documentation', 'court']
      },
      {
        title: 'Explain to my lawyer',
        prompt: 'How do I explain coercive control to my attorney who doesn\'t seem to understand what I\'m dealing with?',
        tags: ['legal', 'education']
      }
    ]
  },
  {
    id: 'court',
    icon: '⚖️',
    title: 'Court Documents',
    description: 'Create and refine legal documents',
    prompts: [
      {
        title: 'Document an incident',
        prompt: 'Help me document this incident in a factual, court-appropriate way. Here\'s what happened:',
        tags: ['documentation', 'incidents']
      },
      {
        title: 'Draft a declaration',
        prompt: 'I need to write a declaration about [topic] for court. Help me organize my thoughts and write it professionally.',
        tags: ['legal', 'writing']
      },
      {
        title: 'Respond to their filing',
        prompt: 'They filed [document] making false claims. Help me draft a response that addresses each point factually.',
        tags: ['legal', 'response']
      },
      {
        title: 'Create a timeline',
        prompt: 'Help me create a timeline of incidents for my attorney. Here are the key events:',
        tags: ['documentation', 'organization']
      },
      {
        title: 'Prepare for court',
        prompt: 'I have a hearing coming up about [topic]. Help me prepare what to say and anticipate their arguments.',
        tags: ['preparation', 'strategy']
      }
    ]
  },
  {
    id: 'coparent',
    icon: '👨‍👩‍👧',
    title: 'Co-Parenting',
    description: 'Navigate parallel parenting with a difficult ex',
    prompts: [
      {
        title: 'Handle schedule conflict',
        prompt: 'There\'s a scheduling conflict about [event]. Help me navigate this without getting pulled into drama.',
        tags: ['schedule', 'boundaries']
      },
      {
        title: 'Kids in the middle',
        prompt: 'They\'re putting the kids in the middle by [behavior]. How do I handle this and protect my children?',
        tags: ['children', 'protection']
      },
      {
        title: 'Information sharing',
        prompt: 'What information am I legally required to share? They demand to know everything about my life.',
        tags: ['boundaries', 'legal']
      },
      {
        title: 'Holiday planning',
        prompt: 'Holidays are coming up and I need to communicate about plans. Help me keep it brief and businesslike.',
        tags: ['schedule', 'communication']
      },
      {
        title: 'New partner issues',
        prompt: 'They\'re [creating drama about / interrogating the kids about] my new partner. How should I handle this?',
        tags: ['boundaries', 'relationships']
      }
    ]
  },
  {
    id: 'healing',
    icon: '💚',
    title: 'Healing & Support',
    description: 'Process emotions and build resilience',
    prompts: [
      {
        title: 'I\'m overwhelmed',
        prompt: 'I\'m completely overwhelmed right now. Everything feels like too much. Can you help me get grounded?',
        tags: ['emotional', 'support']
      },
      {
        title: 'Am I the problem?',
        prompt: 'Sometimes I wonder if I\'m the difficult one. Can you help me reality-check my situation?',
        tags: ['validation', 'clarity']
      },
      {
        title: 'Explain to others',
        prompt: 'My family/friends don\'t understand why I can\'t "just co-parent normally." How do I explain this?',
        tags: ['support', 'education']
      },
      {
        title: 'Help my kids',
        prompt: 'My kids are struggling with [behavior/emotion]. How can I support them through this?',
        tags: ['children', 'parenting']
      },
      {
        title: 'Self-care when depleted',
        prompt: 'I\'m running on empty. What are some quick ways to take care of myself when I have no time or energy?',
        tags: ['self-care', 'practical']
      }
    ]
  }
]

export default function PromptGallery({ onSelectPrompt, onClose }: PromptGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCategories = categories.map(cat => ({
    ...cat,
    prompts: cat.prompts.filter(p => 
      searchQuery === '' ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })).filter(cat => cat.prompts.length > 0)

  const activeCategory = selectedCategory 
    ? filteredCategories.find(c => c.id === selectedCategory)
    : null

  return (
    <div className="gallery-overlay">
      <div className="gallery-modal">
        <div className="gallery-header">
          <div className="header-top">
            <h2>💡 How Can I Help?</h2>
            <button onClick={onClose} className="close-btn">✕</button>
          </div>
          <p>Click any prompt to use it, or use these as inspiration for your own questions.</p>
          <input
            type="text"
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="gallery-content">
          {!activeCategory ? (
            <div className="categories-grid">
              {filteredCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className="category-card"
                >
                  <span className="cat-icon">{cat.icon}</span>
                  <span className="cat-title">{cat.title}</span>
                  <span className="cat-desc">{cat.description}</span>
                  <span className="cat-count">{cat.prompts.length} prompts</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="prompts-view">
              <button onClick={() => setSelectedCategory(null)} className="back-btn">
                ← All Categories
              </button>
              <div className="category-header">
                <span className="cat-icon-large">{activeCategory.icon}</span>
                <div>
                  <h3>{activeCategory.title}</h3>
                  <p>{activeCategory.description}</p>
                </div>
              </div>
              <div className="prompts-list">
                {activeCategory.prompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onSelectPrompt(prompt.prompt)
                      onClose()
                    }}
                    className="prompt-card"
                  >
                    <span className="prompt-title">{prompt.title}</span>
                    <span className="prompt-preview">{prompt.prompt}</span>
                    {prompt.tags && (
                      <div className="prompt-tags">
                        {prompt.tags.map(tag => (
                          <span key={tag} className="tag">{tag}</span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="gallery-footer">
          <div className="tip">
            <strong>💡 Tip:</strong> You can also just tell me what's happening in your own words. 
            I'm here to listen and help however you need.
          </div>
        </div>
      </div>

      <style jsx>{`
        .gallery-overlay {
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

        .gallery-modal {
          background: white;
          border-radius: 24px;
          max-width: 680px;
          width: 100%;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 24px 80px rgba(0,0,0,0.3);
        }

        .gallery-header {
          padding: 28px 28px 20px;
          border-bottom: 1px solid #eee;
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .gallery-header h2 {
          font-size: 24px;
          color: #1a3a2f;
          margin: 0;
        }

        .gallery-header p {
          color: #666;
          font-size: 15px;
          margin: 0 0 16px 0;
        }

        .close-btn {
          background: #f5f5f5;
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          font-size: 18px;
          cursor: pointer;
          color: #666;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: #eee;
          color: #333;
        }

        .search-input {
          width: 100%;
          padding: 14px 18px;
          border: 2px solid #e8e8e8;
          border-radius: 12px;
          font-size: 15px;
          outline: none;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          border-color: #2dd4a8;
        }

        .gallery-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px 28px;
        }

        .categories-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }

        .category-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 20px;
          background: #f8faf9;
          border: 2px solid transparent;
          border-radius: 16px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
        }

        .category-card:hover {
          background: #e8f5e9;
          border-color: #2dd4a8;
          transform: translateY(-2px);
        }

        .cat-icon {
          font-size: 32px;
          margin-bottom: 12px;
        }

        .cat-title {
          font-size: 17px;
          font-weight: 600;
          color: #1a3a2f;
          margin-bottom: 6px;
        }

        .cat-desc {
          font-size: 13px;
          color: #666;
          line-height: 1.4;
          margin-bottom: 10px;
        }

        .cat-count {
          font-size: 12px;
          color: #2dd4a8;
          font-weight: 600;
        }

        .prompts-view {
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .back-btn {
          background: none;
          border: none;
          color: #2dd4a8;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          margin-bottom: 20px;
          transition: color 0.2s;
        }

        .back-btn:hover {
          color: #1a3a2f;
        }

        .category-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #eee;
        }

        .cat-icon-large {
          font-size: 48px;
        }

        .category-header h3 {
          font-size: 22px;
          color: #1a3a2f;
          margin: 0 0 4px 0;
        }

        .category-header p {
          font-size: 14px;
          color: #666;
          margin: 0;
        }

        .prompts-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .prompt-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 18px 20px;
          background: #f8faf9;
          border: 2px solid transparent;
          border-radius: 14px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
        }

        .prompt-card:hover {
          background: white;
          border-color: #2dd4a8;
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
        }

        .prompt-title {
          font-size: 16px;
          font-weight: 600;
          color: #1a3a2f;
          margin-bottom: 8px;
        }

        .prompt-preview {
          font-size: 14px;
          color: #666;
          line-height: 1.5;
          margin-bottom: 10px;
        }

        .prompt-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .tag {
          font-size: 11px;
          padding: 4px 10px;
          background: #e8f5e9;
          color: #2e7d32;
          border-radius: 20px;
          font-weight: 500;
        }

        .gallery-footer {
          padding: 20px 28px;
          border-top: 1px solid #eee;
          background: #f8faf9;
          border-radius: 0 0 24px 24px;
        }

        .tip {
          font-size: 14px;
          color: #666;
          line-height: 1.5;
        }

        .tip strong {
          color: #1a3a2f;
        }

        @media (max-width: 600px) {
          .gallery-modal {
            max-height: 90vh;
            border-radius: 20px;
          }

          .gallery-header {
            padding: 20px 20px 16px;
          }

          .gallery-header h2 {
            font-size: 20px;
          }

          .gallery-content {
            padding: 16px 20px;
          }

          .categories-grid {
            grid-template-columns: 1fr;
          }

          .gallery-footer {
            padding: 16px 20px;
          }

          .category-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .cat-icon-large {
            font-size: 36px;
          }
        }
      `}</style>
    </div>
  )
}