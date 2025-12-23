'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import SafetyResources, { detectCrisis } from '@/components/SafetyResources';
import OnboardingWow from '@/components/OnboardingWow';

// ============================================
// TYPES
// ============================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  patterns?: string[];
  savedToEvidence?: boolean;
}

interface CaseContext {
  caseNumber: string;
  court: string;
  petitionerName: string;
  respondentName: string;
  userRole: string;
  coparentName: string;
  nextCourtDate: string | null;
}

// ============================================
// CONSTANTS
// ============================================

const affirmations = [
  { text: "Their chaos is not your emergency.", subtext: "You are allowed to pause." },
  { text: "You are not crazy. This is real.", subtext: "Trust what you've lived." },
  { text: "Silence is a complete response.", subtext: "You don't owe them an explanation." },
  { text: "You're building something they can't take.", subtext: "Every document is proof." },
  { text: "Your peace is not up for negotiation.", subtext: "Protect it fiercely." },
  { text: "The best response is often no response.", subtext: "Let them tell on themselves." },
  { text: "You survived 100% of your worst days.", subtext: "You'll survive this one too." },
  { text: "Document. Breathe. Protect. Repeat.", subtext: "You're doing it right." },
  { text: "They want you reactive. Stay grounded.", subtext: "Your calm is your superpower." },
  { text: "Be present. Be prepared. Be empowered.", subtext: "You've got this." },
];

const groundingSteps = [
  { sense: 'SEE', instruction: 'Name 5 things you can see right now.', icon: '👁️' },
  { sense: 'TOUCH', instruction: 'Name 4 things you can physically feel.', icon: '✋' },
  { sense: 'HEAR', instruction: 'Name 3 things you can hear.', icon: '👂' },
  { sense: 'SMELL', instruction: 'Name 2 things you can smell.', icon: '👃' },
  { sense: 'TASTE', instruction: 'Name 1 thing you can taste.', icon: '👅' },
];

const bodyScanSteps = [
  { area: 'Feet', instruction: 'Feel your feet on the ground. Notice the weight, the temperature, the connection to the earth.', icon: '🦶' },
  { area: 'Legs', instruction: 'Scan up through your legs. Release any tension in your calves, knees, thighs. Let them soften.', icon: '🦵' },
  { area: 'Belly', instruction: 'Place a hand on your belly. Feel it rise and fall. This is your center. You are safe here.', icon: '🫁' },
  { area: 'Chest', instruction: 'Notice your heart. It has carried you through so much. Thank it for keeping you going.', icon: '💚' },
  { area: 'Shoulders', instruction: 'Drop your shoulders away from your ears. Roll them back. Release what you have been carrying.', icon: '💆' },
  { area: 'Jaw', instruction: 'Unclench your jaw. Let your tongue rest. Soften the space between your eyebrows.', icon: '😌' },
  { area: 'Whole Body', instruction: 'Take one deep breath. You are here. You are whole. You are safe in this moment.', icon: '✨' },
];

const breathingTypes = {
  box: { name: 'Box Breathing', desc: 'Used by Navy SEALs to stay calm', phases: ['inhale', 'hold', 'exhale', 'hold2'], times: [4, 4, 4, 4] },
  '478': { name: '4-7-8 Breath', desc: 'Deep calm and better sleep', phases: ['inhale', 'hold', 'exhale'], times: [4, 7, 8] },
  sigh: { name: 'Physiological Sigh', desc: 'Fastest way to calm down', phases: ['inhale', 'inhale', 'exhale'], times: [2, 1, 6] },
};

const kidConnectionIdeas = [
  // Toddlers & Preschool (2-5)
  { idea: "Create a 'hug token' they can save", desc: "Give them something small they can hold when they miss you - a smooth rock, a button, a little heart. Tell them it holds your hugs.", age: "Ages 2-5", category: "connection" },
  { idea: "Make up a special goodbye ritual", desc: "A secret handshake, butterfly kisses, or a silly phrase only you two know. Consistency builds security in little ones.", age: "Ages 2-5", category: "ritual" },
  { idea: "Read the same book at bedtime", desc: "Even apart, you can both read the same story at night. 'I'm reading this to you right now, wherever you are.'", age: "Ages 2-5", category: "connection" },
  
  // School Age (6-10)
  { idea: "Start a joke exchange", desc: "Kids this age LOVE jokes. Text them a riddle or knock-knock joke to share. They'll look forward to your humor.", age: "Ages 6-10", category: "fun" },
  { idea: "Create a secret code together", desc: "Simple symbols that mean 'I love you' or 'thinking of you.' They can draw it, you can text it. A private language.", age: "Ages 6-10", category: "connection" },
  { idea: "Plan a 'someday' adventure list", desc: "Dream together about places to go, things to try. The anticipation is bonding even if it takes time.", age: "Ages 6-10", category: "planning" },
  { idea: "Learn a skill together", desc: "Magic trick, card game, origami, a few words in another language. Mastering something together builds confidence.", age: "Ages 6-10", category: "growth" },
  
  // Tweens (10-13)
  { idea: "Ask their opinion on something real", desc: "Tweens want to feel respected. Ask what they think about a decision (appropriate one). Their input matters.", age: "Ages 10-13", category: "respect" },
  { idea: "Share music with each other", desc: "Send them a song, ask what they're listening to. Music is identity at this age - showing interest shows love.", age: "Ages 10-13", category: "connection" },
  { idea: "Create a shared playlist", desc: "Add songs that remind you of each other. A living document of your relationship.", age: "Ages 10-13", category: "creative" },
  
  // Teens (13-18)
  { idea: "Text without expecting a response", desc: "Teens need space but also need to know you're there. 'Just thinking of you. No reply needed.' removes pressure.", age: "Ages 13-18", category: "space" },
  { idea: "Acknowledge their hard stuff", desc: "'I know this situation is hard on you too. I see you.' Teens often feel invisible in adult conflict.", age: "Ages 13-18", category: "validation" },
  { idea: "Share something vulnerable", desc: "Age-appropriately share a struggle or mistake you made at their age. It builds trust and models authenticity.", age: "Ages 13-18", category: "trust" },
  { idea: "Support their interests without agenda", desc: "Ask about their game, their friend, their hobby. No segue into life lessons. Just genuine curiosity.", age: "Ages 13-18", category: "respect" },
  
  // All Ages
  { idea: "Write letters for the future", desc: "Letters they'll read someday - about this time, how hard you fought, how much you love them. Healing for you both.", age: "All ages", category: "legacy" },
  { idea: "Create a memory jar together", desc: "Write happy moments on slips of paper. Open them when you're together or when times are hard.", age: "All ages", category: "ritual" },
  { idea: "Establish a 'thinking of you' signal", desc: "Every time you see a rainbow, a certain bird, or a specific time (11:11), you're both thinking of each other.", age: "All ages", category: "connection" },
  { idea: "Celebrate tiny moments", desc: "Not just birthdays - celebrate Tuesday, celebrate sunshine, celebrate being together. Joy doesn't need permission.", age: "All ages", category: "presence" },
];

const gratitudePrompts = [
  { prompt: "What's one small thing that went right today?", followup: "Even tiny wins count." },
  { prompt: "Who showed you kindness recently?", followup: "It's okay if it was yourself." },
  { prompt: "What's something your body did for you today?", followup: "It carried you through." },
  { prompt: "What's a challenge you've survived?", followup: "You're still here. That's strength." },
  { prompt: "What do your kids teach you?", followup: "They see things we forget to notice." },
  { prompt: "What's one thing you're looking forward to?", followup: "Even small things count." },
  { prompt: "What made you smile this week?", followup: "Joy still finds you." },
  { prompt: "What's something you did well recently?", followup: "You're doing better than you think." },
  { prompt: "Who would you thank if you could?", followup: "Gratitude heals the giver." },
  { prompt: "What's beautiful around you right now?", followup: "Beauty exists even in hard seasons." },
];

const morningIntentions = [
  { intention: "Today, I choose peace over proving.", reflection: "You don't need to justify your reality to anyone." },
  { intention: "Their chaos is not my emergency.", reflection: "You set the pace of your day, not them." },
  { intention: "I respond from strength, not fear.", reflection: "Every calm response is a victory." },
  { intention: "I am building a life they can't touch.", reflection: "Document. Breathe. Protect. Repeat." },
  { intention: "My peace is not negotiable today.", reflection: "The boundaries you set teach your kids what's acceptable." },
  { intention: "I release what I cannot control.", reflection: "Focus only on your next right move." },
  { intention: "Today I trust my own perception.", reflection: "You are not crazy. This is real." },
  { intention: "I am the calm in my children's storm.", reflection: "Your regulation teaches them regulation." },
];

const eveningReflections = [
  { reflection: "What did I handle well today?", prompt: "Even small wins matter. Celebrate them." },
  { reflection: "What can I release from today?", prompt: "It served its purpose. Let it go now." },
  { reflection: "What am I grateful for tonight?", prompt: "Gratitude rewires your brain for hope." },
  { reflection: "How did I show up for myself?", prompt: "Self-care isn't selfish. It's survival." },
  { reflection: "What would I tell a friend in my situation?", prompt: "Now tell yourself the same thing." },
  { reflection: "What do I need to forgive myself for?", prompt: "You're doing your best in impossible circumstances." },
];

const quickActions = [
  { icon: '📱', title: 'Upload something', desc: 'Saved and analyzed for when you need it', action: '__UPLOAD__' },
  { icon: '📄', title: 'Build a document', desc: 'Your orders + your documentation = court-ready', action: '__DOCUMENT__' },
  { icon: '🌿', title: 'I need a moment', desc: 'Breathing, grounding, support', action: '__REGULATE__' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function CoachPage() {
  const router = useRouter();
  
  // Core state
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Conversation history state
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [pastConversations, setPastConversations] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // UI state
  const [showSidebar, setShowSidebar] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [savingEvidence, setSavingEvidence] = useState<string | null>(null);
  
  // Safety state
  const [showSafetyResources, setShowSafetyResources] = useState(false);
  const [safetyTriggered, setSafetyTriggered] = useState(false);
  
  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // What's New and Feedback modals
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'feedback' | 'feature' | 'bug'>('feedback');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  // Case & evidence state
  const [caseContext, setCaseContext] = useState<CaseContext | null>(null);
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [daysUntilCourt, setDaysUntilCourt] = useState<number | null>(null);
  
  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState({ title: '', subtitle: '' });
  
  const milestones: Record<number, { title: string; subtitle: string }> = {
    1: { title: '🎉 First evidence saved!', subtitle: 'You\'re building your case. Every piece matters.' },
    5: { title: '📊 5 pieces documented!', subtitle: 'You\'re creating a paper trail they can\'t deny.' },
    10: { title: '💪 10 documented!', subtitle: 'Double digits! Your case is getting stronger.' },
    25: { title: '🔥 25 pieces of evidence!', subtitle: 'You\'re doing the hard work. It will pay off.' },
    50: { title: '⭐ 50 documented incidents!', subtitle: 'This is serious documentation. You\'re prepared.' },
    100: { title: '🏆 100 pieces of evidence!', subtitle: 'You have built an incredible case file.' },
    150: { title: '👑 150 and counting!', subtitle: 'Your documentation is undeniable.' },
    200: { title: '🎯 200 documented!', subtitle: 'You are a documentation warrior.' },
  };

  const checkMilestone = (newCount: number) => {
    if (milestones[newCount]) {
      setCelebrationMessage(milestones[newCount]);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 4000);
    }
  };
  
  // Regulate state
  const [showRegulate, setShowRegulate] = useState(false);
  const [regulateMode, setRegulateMode] = useState<'menu' | 'breathe' | 'ground' | 'affirm' | 'body' | 'release' | 'shake' | 'kids' | 'gratitude'>('menu');
  const [breatheType, setBreatheType] = useState<'box' | '478' | 'sigh'>('box');
  const [breathePhase, setBreathePhase] = useState<'inhale' | 'hold' | 'exhale' | 'hold2'>('inhale');
  const [breatheCount, setBreatheCount] = useState(0);
  const [groundStep, setGroundStep] = useState(0);
  const [bodyStep, setBodyStep] = useState(0);
  const [releaseText, setReleaseText] = useState('');
  const [shakeSeconds, setShakeSeconds] = useState(30);
  const [currentAffirmation, setCurrentAffirmation] = useState(affirmations[0]);
  const [currentKidIdea, setCurrentKidIdea] = useState(kidConnectionIdeas[0]);
  const [currentGratitude, setCurrentGratitude] = useState(gratitudePrompts[0]);
  
  // Morning/Evening healing content
  const [showMorningContent, setShowMorningContent] = useState(false);
  const [showEveningContent, setShowEveningContent] = useState(false);
  
  // "Before You Respond" Pause state
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  
  // Unified Upload Modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMode, setUploadMode] = useState<'choose' | 'processing' | 'preview'>('choose');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [detectedType, setDetectedType] = useState<'screenshot' | 'court_order' | 'message_export' | 'unknown' | null>(null);
  const [pasteText, setPasteText] = useState('');
  
  // Detect file type from uploaded file
  const detectFileType = (file: File): 'screenshot' | 'court_order' | 'message_export' | 'unknown' => {
    const name = file.name.toLowerCase();
    const type = file.type;
    
    // Image files = screenshots
    if (type.startsWith('image/')) {
      return 'screenshot';
    }
    
    // CSV or TXT with message-related names = message export
    if (name.includes('message') || name.includes('sms') || name.includes('text') || 
        name.includes('imessage') || name.includes('chat') || name.includes('export')) {
      return 'message_export';
    }
    
    // PDF with order/custody/court in name = court order
    if (type === 'application/pdf' && 
        (name.includes('order') || name.includes('custody') || name.includes('court') || 
         name.includes('decree') || name.includes('parenting') || name.includes('judgment'))) {
      return 'court_order';
    }
    
    // Generic PDF - could be either, we'll ask
    if (type === 'application/pdf') {
      return 'unknown'; // Will ask user
    }
    
    // CSV/TXT default to message export
    if (name.endsWith('.csv') || name.endsWith('.txt')) {
      return 'message_export';
    }
    
    return 'unknown';
  };
  
  const handleUploadFile = async (file: File, type: 'screenshot' | 'court_order' | 'message_export') => {
    setShowUploadModal(false);
    setUploadMode('choose');
    setUploadedFile(null);
    setDetectedType(null);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileType', type);
    formData.append('history', JSON.stringify(messages.map(m => ({ role: m.role, content: m.content }))));
    if (caseContext) formData.append('caseContext', JSON.stringify(caseContext));
    
    // Set appropriate message based on type
    let promptMessage = '';
    if (type === 'screenshot') {
      promptMessage = "I'm uploading a screenshot of a message. Please extract the text, identify any manipulation patterns, and tell me if I need to respond.";
    } else if (type === 'court_order') {
      promptMessage = "I'm uploading a court order. Please extract and remember the key information: custody schedule, important rules, deadlines, and any provisions I should know about. This will help you reference the order in future conversations.";
    } else if (type === 'message_export') {
      promptMessage = "I'm uploading a message history export. Please analyze the messages for patterns of manipulation or coercive control, summarize what you find, and save any significant incidents to my evidence.";
    }
    formData.append('message', promptMessage);
    
    setIsLoading(true);
    setShowWelcome(false);
    
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `[Uploaded: ${file.name}] ${promptMessage}`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    
    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }]);
    
    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        body: formData,
      });
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let detectedPatterns: string[] = [];
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, content: m.content + parsed.content } : m
                ));
              }
              if (parsed.patterns) {
                detectedPatterns = parsed.patterns;
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, patterns: parsed.patterns } : m
                ));
              }
            } catch {}
          }
        }
      }
    }
      
    // Auto-save screenshots to evidence timeline
    if (type === 'screenshot' && fullContent) {
      autoSaveToTimeline(file, fullContent, detectedPatterns);
    }
  } catch (error) {
    } catch (error) {
      console.error('Upload error:', error);
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: 'Sorry, I had trouble processing that file. Please try again.' } : m
      ));
    }
    
    setIsLoading(false);
  };
  // Auto-save screenshot uploads to evidence timeline
  const autoSaveToTimeline = async (file: File, aiResponse: string, patterns: string[]) => {
    if (!user) return;
    setAutoSaveStatus('saving');
    
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      
      const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const fileName = `${user.id}/${Date.now()}.png`;
      
      await supabase.storage
        .from('evidence-screenshots')
        .upload(fileName, buffer, { contentType: 'image/png' });
      
      const { data: urlData } = supabase.storage
        .from('evidence-screenshots')
        .getPublicUrl(fileName);
      
      await supabase.from('evidence_timeline').insert({
        user_id: user.id,
        screenshot_urls: urlData?.publicUrl ? [urlData.publicUrl] : [],
        patterns_detected: patterns,
        coaching_summary: aiResponse,
        co_parent_name: caseContext?.coparentName || null,
        incident_date: new Date().toISOString(),
        auto_saved: true,
        needs_review: true,
        reviewed: false,
      });
      
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('Auto-save error:', err);
      setAutoSaveStatus('idle');
    }
  };
  const handlePasteSubmit = () => {
    if (!pasteText.trim()) return;
    setShowUploadModal(false);
    setPasteText('');
    setInput(`I just received this message and need help understanding what's really going on:\n\n${pasteText}`);
    setTimeout(() => sendMessage(`I just received this message and need help understanding what's really going on:\n\n${pasteText}`, true), 100);
  };
  
  // Detect if user might be activated (responding to triggering content)
  const detectActivation = (message: string): boolean => {
    const lowerMsg = message.toLowerCase();
    
    // Check if they're drafting a response
    const isDraftingResponse = 
      lowerMsg.includes('help me respond') ||
      lowerMsg.includes('draft a response') ||
      lowerMsg.includes('what should i say') ||
      lowerMsg.includes('how do i reply') ||
      lowerMsg.includes('respond to this') ||
      lowerMsg.includes('write back') ||
      lowerMsg.includes('tell them') ||
      lowerMsg.includes('say back');
    
    if (!isDraftingResponse) return false;
    
    // Check for signs of emotional activation in the pasted content
    const activationSigns = [
      // Anger indicators
      'can\'t believe', 'unbelievable', 'ridiculous', 'insane', 'crazy',
      'furious', 'pissed', 'livid', 'angry', 'mad',
      // Threat indicators  
      'lawyer', 'court', 'custody', 'police', 'sue', 'judge',
      // Manipulation red flags
      'never said', 'you always', 'you never', 'your fault', 'blame',
      'liar', 'lying', 'lie', 'manipulat', 'narciss', 'abuse',
      // Urgency/pressure
      'immediately', 'right now', 'asap', 'urgent', 'emergency',
      'or else', 'last chance', 'final warning',
      // Emotional hooks
      'the kids', 'children deserve', 'bad parent', 'bad mother', 'bad father',
      // ALL CAPS (sign of yelling in message)
      /[A-Z]{5,}/.test(message) ? 'caps_detected' : '',
      // Excessive punctuation
      /[!?]{2,}/.test(message) ? 'exclaim_detected' : '',
    ].filter(Boolean);
    
    const activationCount = activationSigns.filter(sign => 
      typeof sign === 'string' && lowerMsg.includes(sign)
    ).length;
    
    // Also check for caps and exclamation patterns
    const hasCapsYelling = /[A-Z]{5,}/.test(message);
    const hasExcessivePunctuation = /[!?]{3,}/.test(message);
    
    return activationCount >= 2 || hasCapsYelling || hasExcessivePunctuation;
  };
  
  // Refs
  const chatRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================
  // AUTH & DATA LOADING
  // ============================================

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      
      // Check for active subscription
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('email', session.user.email?.toLowerCase())
        .in('status', ['active', 'trialing'])
        .single();
      
      if (!subscription) {
        router.push('/subscribe');
        return;
      }
      
      setUser(session.user);
      
      // Load case context
      const { data: caseData } = await supabase
        .from('case_context')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      if (caseData) {
        setCaseContext(caseData);
        if (caseData.nextCourtDate) {
          const days = Math.ceil((new Date(caseData.nextCourtDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (days > 0) setDaysUntilCourt(days);
        }
      }
      
      // Load evidence count - check both tables
      const { count: evidenceTableCount } = await supabase
        .from('evidence')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);
      
      const { count: incidentsCount } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);
      
      setEvidenceCount((evidenceTableCount || 0) + (incidentsCount || 0));
      
      // Check if first time user (show onboarding)
      const hasSeenOnboarding = localStorage.getItem('p18_onboarding_complete');
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }
      
      // Check healing preferences for morning/evening content
      const { data: healingPrefs } = await supabase
        .from('healing_preferences')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      if (healingPrefs) {
        const hour = new Date().getHours();
        const todayKey = new Date().toDateString();
        
        // Morning check (5am-11am)
        if (healingPrefs.morning_intention && hour >= 5 && hour < 11) {
          const lastMorningShown = localStorage.getItem('p18_morning_shown');
          if (lastMorningShown !== todayKey) {
            setShowMorningContent(true);
            localStorage.setItem('p18_morning_shown', todayKey);
          }
        }
        
        // Evening check (7pm-11pm)
        if (healingPrefs.evening_release && hour >= 19 && hour < 23) {
          const lastEveningShown = localStorage.getItem('p18_evening_shown');
          if (lastEveningShown !== todayKey) {
            setShowEveningContent(true);
            localStorage.setItem('p18_evening_shown', todayKey);
          }
        }
      }
      
      // Load past conversations
      const { data: convos } = await supabase
        .from('conversations')
        .select('id, title, preview, updated_at, patterns_found')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false })
        .limit(20);
      
      if (convos) {
        setPastConversations(convos);
      }
      
      setAuthLoading(false);
    };
    
    init();
  }, [router]);

  // Save conversation when messages change
  useEffect(() => {
    const saveConversation = async () => {
      if (!user || messages.length === 0) return;
      
      // Generate title from first user message
      const firstUserMsg = messages.find(m => m.role === 'user');
      const title = firstUserMsg?.content?.slice(0, 50) + (firstUserMsg?.content && firstUserMsg.content.length > 50 ? '...' : '') || 'New conversation';
      
      // Get preview from last assistant message
      const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
      const preview = lastAssistantMsg?.content?.slice(0, 100) || '';
      
      // Collect all patterns found
      const allPatterns = messages
        .filter(m => m.patterns && m.patterns.length > 0)
        .flatMap(m => m.patterns || []);
      const uniquePatterns = [...new Set(allPatterns)];
      
      if (currentConversationId) {
        // Update existing conversation
        await supabase
          .from('conversations')
          .update({
            messages: messages,
            title,
            preview,
            patterns_found: uniquePatterns,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentConversationId);
      } else if (messages.length >= 2) {
        // Create new conversation after first exchange
        const { data } = await supabase
          .from('conversations')
          .insert({
            user_id: user.id,
            messages: messages,
            title,
            preview,
            patterns_found: uniquePatterns,
          })
          .select('id')
          .single();
        
        if (data) {
          setCurrentConversationId(data.id);
          // Refresh conversation list
          const { data: convos } = await supabase
            .from('conversations')
            .select('id, title, preview, updated_at, patterns_found')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(20);
          if (convos) setPastConversations(convos);
        }
      }
    };
    
    const debounce = setTimeout(saveConversation, 1000);
    return () => clearTimeout(debounce);
  }, [messages, user, currentConversationId]);

  // Auto-scroll
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle onboarding action selection
  useEffect(() => {
    const handleOnboardingAction = (e: CustomEvent) => {
      const action = e.detail;
      setShowWelcome(false);
      
      switch (action) {
        case 'screenshot':
          setShowUploadModal(true);
          setUploadMode('choose');
          break;
        case 'paste':
          // Focus on input with a helpful prompt
          setInput("I just received this message and need help understanding what's really going on:\n\n");
          setTimeout(() => {
            const textarea = document.querySelector('.input-container textarea') as HTMLTextAreaElement;
            if (textarea) {
              textarea.focus();
              textarea.setSelectionRange(textarea.value.length, textarea.value.length);
            }
          }, 100);
          break;
        case 'court_order':
          setShowUploadModal(true);
          setUploadMode('choose');
          break;
        case 'explore':
          // Just show the welcome screen with quick actions
          setShowWelcome(true);
          break;
      }
    };
    
    window.addEventListener('onboarding-action', handleOnboardingAction as EventListener);
    return () => window.removeEventListener('onboarding-action', handleOnboardingAction as EventListener);
  }, []);

  // Breathing animation - handles different breathing types
  useEffect(() => {
    if (showRegulate && regulateMode === 'breathe') {
      const config = breathingTypes[breatheType];
      const phases = config.phases as ('inhale' | 'hold' | 'exhale' | 'hold2')[];
      const times = config.times;
      let index = 0;
      
      const cycle = () => {
        setBreathePhase(phases[index]);
        setBreatheCount(times[index]);
        const duration = times[index] * 1000;
        index = (index + 1) % phases.length;
        return duration;
      };
      
      let timeout: NodeJS.Timeout;
      const runCycle = () => {
        const duration = cycle();
        timeout = setTimeout(runCycle, duration);
      };
      
      runCycle();
      return () => clearTimeout(timeout);
    }
  }, [showRegulate, regulateMode, breatheType]);

  // Shake timer
  useEffect(() => {
    if (showRegulate && regulateMode === 'shake' && shakeSeconds > 0) {
      const timer = setTimeout(() => setShakeSeconds(s => s - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [showRegulate, regulateMode, shakeSeconds]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const startNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setShowWelcome(true);
    setShowHistory(false);
    setShowSidebar(false);
  };

  const loadConversation = async (conversationId: string) => {
    const { data } = await supabase
      .from('conversations')
      .select('messages')
      .eq('id', conversationId)
      .single();
    
    if (data?.messages) {
      // Convert timestamp strings back to Date objects
      const messagesWithDates = data.messages.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
      setMessages(messagesWithDates);
      setCurrentConversationId(conversationId);
      setShowWelcome(false);
      setShowHistory(false);
      setShowSidebar(false);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);
    
    setPastConversations(prev => prev.filter(c => c.id !== conversationId));
    
    if (currentConversationId === conversationId) {
      startNewConversation();
    }
  };

  const sendMessage = async (overrideMessage?: string, bypassPause?: boolean) => {
    const messageText = overrideMessage || input.trim();
    if (!messageText || isLoading) return;

    // Check if user might be activated and needs a pause
    if (!bypassPause && detectActivation(messageText)) {
      setPendingMessage(messageText);
      setShowPauseModal(true);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setShowWelcome(false);

    // Check for crisis keywords - gentle safety check
    if (detectCrisis(messageText)) {
      setSafetyTriggered(true);
      setShowSafetyResources(true);
    }

    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }]);

    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          history: messages.map(m => ({ role: m.role, content: m.content })),
          caseContext,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let patterns: string[] = [];

      if (!reader) throw new Error('No reader');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                setMessages(prev => prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: m.content + data.text }
                    : m
                ));
              }
              if (data.patterns) {
                patterns = data.patterns;
              }
              if (data.done && patterns.length > 0) {
                setMessages(prev => prev.map(m =>
                  m.id === assistantId
                    ? { ...m, patterns }
                    : m
                ));
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: 'I apologize, but I encountered an error. Please try again.' }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  // Evidence save modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveModalData, setSaveModalData] = useState<{
    msg: Message;
    userMsg?: Message;
  } | null>(null);
  const [evidenceDetails, setEvidenceDetails] = useState({
    messageDate: '',
    messageTime: '',
    sourcePlatform: 'text',
    senderName: '',
    contextNotes: '',
  });

  const openSaveModal = (msg: Message, userMsg?: Message) => {
    setSaveModalData({ msg, userMsg });
    // Pre-fill sender name from case context
    setEvidenceDetails(prev => ({
      ...prev,
      senderName: caseContext?.coparentName || '',
      messageDate: new Date().toISOString().split('T')[0],
      messageTime: '',
      sourcePlatform: 'text',
      contextNotes: '',
    }));
    setShowSaveModal(true);
  };

  const saveToEvidence = async (msg: Message, userMsg?: Message, details?: typeof evidenceDetails) => {
    if (!user || savingEvidence) return;
    setSavingEvidence(msg.id);

    try {
      // Parse message date if provided
      let messageDateTime = null;
      if (details?.messageDate) {
        const dateStr = details.messageDate;
        const timeStr = details.messageTime || '12:00';
        messageDateTime = new Date(`${dateStr}T${timeStr}`).toISOString();
      }

      await supabase.from('evidence').insert({
        user_id: user.id,
        type: 'ai_analysis',
        content: msg.content,
        original_message: userMsg?.content || null,
        original_text: userMsg?.content || null,
        patterns: msg.patterns || [],
        message_date: messageDateTime,
        source_platform: details?.sourcePlatform || 'text',
        sender: details?.senderName || caseContext?.coparentName || null,
        is_from_coparent: true,
        context_notes: details?.contextNotes || null,
        source: 'coach',
        created_at: new Date().toISOString(),
      });

      setMessages(prev => prev.map(m =>
        m.id === msg.id ? { ...m, savedToEvidence: true } : m
      ));
      const newCount = evidenceCount + 1;
      setEvidenceCount(newCount);
      checkMilestone(newCount);
      setShowSaveModal(false);
      setSaveModalData(null);
    } catch (error) {
      console.error('Failed to save evidence:', error);
    } finally {
      setSavingEvidence(null);
    }
  };

  const handleQuickSave = (msg: Message, userMsg?: Message) => {
    // For quick save without modal, use defaults
    saveToEvidence(msg, userMsg, {
      messageDate: new Date().toISOString().split('T')[0],
      messageTime: '',
      sourcePlatform: 'text',
      senderName: caseContext?.coparentName || '',
      contextNotes: '',
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const selectQuickAction = (action: string) => {
    if (action === '__UPLOAD__') {
      setShowUploadModal(true);
      setUploadMode('choose');
      return;
    }
    if (action === '__DOCUMENT__') {
      router.push('/court-docs');
      return;
    }
    if (action === '__REGULATE__') {
      setShowRegulate(true);
      setRegulateMode('menu');
      return;
    }
    // Legacy support for prompts
    if (action === '__SCREENSHOT__') {
      fileInputRef.current?.click();
      return;
    }
    setInput(action);
    setShowWelcome(false);
  };

  const nextAffirmation = () => {
    const currentIndex = affirmations.indexOf(currentAffirmation);
    setCurrentAffirmation(affirmations[(currentIndex + 1) % affirmations.length]);
  };

  const nextKidIdea = () => {
    const currentIndex = kidConnectionIdeas.indexOf(currentKidIdea);
    setCurrentKidIdea(kidConnectionIdeas[(currentIndex + 1) % kidConnectionIdeas.length]);
  };

  const nextGratitude = () => {
    const currentIndex = gratitudePrompts.indexOf(currentGratitude);
    setCurrentGratitude(gratitudePrompts[(currentIndex + 1) % gratitudePrompts.length]);
  };

  // ============================================
  // RENDER
  // ============================================

  if (authLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-heart">💚</div>
        <p>Loading your safe space...</p>
        <style jsx>{`
          .loading-screen {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: #f5f7f6;
          }
          .loading-heart {
            font-size: 48px;
            animation: pulse 1.5s ease-in-out infinite;
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Celebration Toast */}
      {showCelebration && (
        <div className="celebration-toast">
          <div className="celebration-content">
            <div className="celebration-title">{celebrationMessage.title}</div>
            <div className="celebration-subtitle">{celebrationMessage.subtitle}</div>
          </div>
        </div>
      )}

      {/* Sidebar Overlay */}
      {showSidebar && <div className="overlay" onClick={() => setShowSidebar(false)} />}

      {/* Sidebar */}
      <div className={`sidebar ${showSidebar ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span className="sidebar-logo">18</span>
            <span>Pattern 18</span>
          </div>
          <button onClick={() => setShowSidebar(false)} className="close-btn">×</button>
        </div>
        
        {/* New Conversation Button */}
        <button onClick={startNewConversation} className="new-chat-btn">
          + New Conversation
        </button>
        
        {/* Conversation History */}
        {pastConversations.length > 0 && (
          <div className="history-section">
            <button 
              className="history-toggle" 
              onClick={() => setShowHistory(!showHistory)}
            >
              🕐 Recent Chats ({pastConversations.length})
              <span className={`toggle-arrow ${showHistory ? 'open' : ''}`}>›</span>
            </button>
            
            {showHistory && (
              <div className="history-list">
                {pastConversations.map(convo => (
                  <div 
                    key={convo.id} 
                    className={`history-item ${currentConversationId === convo.id ? 'active' : ''}`}
                    onClick={() => loadConversation(convo.id)}
                  >
                    <div className="history-item-content">
                      <span className="history-title">{convo.title || 'Untitled'}</span>
                      <span className="history-date">
                        {new Date(convo.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    {convo.patterns_found && convo.patterns_found.length > 0 && (
                      <span className="history-patterns">{convo.patterns_found.length} patterns</span>
                    )}
                    <button 
                      className="history-delete"
                      onClick={(e) => { e.stopPropagation(); deleteConversation(convo.id); }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        <nav className="nav">
          <button className="nav-item active">
            Coach
          </button>
          <button onClick={() => { router.push('/evidence'); setShowSidebar(false); }} className="nav-item">
            My Evidence
          </button>
          <button onClick={() => { router.push('/filings'); setShowSidebar(false); }} className="nav-item">
            Court Calendar
          </button>
          
          <div className="nav-divider" />
          
          <button onClick={() => router.push('/case-setup')} className="nav-item">
  📋 My Case
</button>
          <button onClick={() => { setShowOnboarding(true); setShowSidebar(false); }} className="nav-item">
  How It Works
</button>
          <button onClick={() => { setShowFeedback(true); setShowSidebar(false); }} className="nav-item">
            Feedback
          </button>
          
          <div className="nav-divider" />
          
          <button onClick={() => { setSafetyTriggered(false); setShowSafetyResources(true); setShowSidebar(false); }} className="nav-item">
            Safety Resources
          </button>
          <button onClick={handleLogout} className="nav-item logout">
            Log Out
          </button>
        </nav>
      </div>

      {/* Header */}
      <header className="header">
        <div className="header-left">
          <button onClick={() => setShowSidebar(true)} className="menu-btn">☰</button>
          <div className="brand" onClick={() => router.push('/dashboard')} style={{cursor: 'pointer'}}>
            <span className="logo">18</span>
            <div className="brand-text">
              <span className="brand-name">Pattern 18</span>
              <span className="brand-tag">Your 24/7 Strategic Partner</span>
            </div>
          </div>
        </div>
        <div className="header-right">
          {messages.length > 0 && (
            <button onClick={startNewConversation} className="new-chat-header-btn" title="New conversation">
              +
            </button>
          )}
          {daysUntilCourt && (
            <div className="court-badge" onClick={() => router.push('/case-setup')}>
              <span className="court-days">{daysUntilCourt}</span>
              <span className="court-label">days to court</span>
            </div>
          )}
          <div className="evidence-badge" onClick={() => router.push('/evidence')}>
            <span className="evidence-count">{evidenceCount}</span>
            <span>Documented</span>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="chat-area" ref={chatRef}>
        {showWelcome ? (
          <div className="welcome">
            <div className="welcome-heart">💚</div>
            <h1 className="welcome-title">Hey, I am glad you are here.</h1>
            <p className="welcome-text">
              Whether you just got a message that made your stomach drop, 
              need help with a court document, or simply need a moment to breathe - I have got you.
            </p>

            <div className="quick-actions">
              <h3>What can I help with?</h3>
              <div className="actions-grid">
                {quickActions.map((qa, i) => (
                  <button 
                    key={i} 
                    className={`action-card ${i === 0 ? 'primary-action' : ''}`} 
                    onClick={() => selectQuickAction(qa.action)}
                  >
                    <span className="action-icon">{qa.icon}</span>
                    <div>
                      <div className="action-title">{qa.title}</div>
                      <div className="action-desc">{qa.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {pastConversations.length > 0 && (
              <div className="recent-chats-welcome">
                <span className="recent-label">Continue a conversation:</span>
                <div className="recent-chips">
                  {pastConversations.slice(0, 3).map(convo => (
                    <button 
                      key={convo.id}
                      className="recent-chip"
                      onClick={() => loadConversation(convo.id)}
                    >
                      {convo.title?.slice(0, 30) || 'Untitled'}...
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="messages">
            {messages.map((msg, idx) => (
              <div key={msg.id} className={`message ${msg.role}`}>
                <div className="bubble">
                  {msg.content || (isLoading && msg.role === 'assistant' ? '...' : '')}
                </div>
                {msg.role === 'assistant' && msg.content && (
                  <div className="message-actions">
                    <div className="action-buttons">
                      <button onClick={() => navigator.clipboard.writeText(msg.content)} className="action-btn">
                        Copy
                      </button>
                      {msg.patterns && msg.patterns.length > 0 && (
                        msg.savedToEvidence ? (
                          <span className="saved-badge">✓ Saved</span>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                const userMsg = idx > 0 ? messages[idx - 1] : undefined;
                                handleQuickSave(msg, userMsg);
                              }}
                              disabled={savingEvidence === msg.id}
                              className="action-btn save"
                            >
                              {savingEvidence === msg.id ? 'Saving...' : 'Quick Save'}
                            </button>
                            <button
                              onClick={() => {
                                const userMsg = idx > 0 ? messages[idx - 1] : undefined;
                                openSaveModal(msg, userMsg);
                              }}
                              className="action-btn details"
                            >
                              + Details
                            </button>
                          </>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="input-area">
        <div className="input-container">
          <button onClick={() => fileInputRef.current?.click()} className="attach-btn">📎</button>
          <input 
            type="file" 
            ref={fileInputRef} 
            hidden 
            accept="image/*,.pdf" 
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              
              const formData = new FormData();
              formData.append('file', file);
              formData.append('message', input || '');
              formData.append('history', JSON.stringify(messages.map(m => ({ role: m.role, content: m.content }))));
              if (caseContext) formData.append('caseContext', JSON.stringify(caseContext));
              
              setIsLoading(true);
              setShowWelcome(false);
              
              const userMsg: Message = {
                id: Date.now().toString(),
                role: 'user',
                content: input || `[Uploaded: ${file.name}]`,
                timestamp: new Date(),
              };
              setMessages(prev => [...prev, userMsg]);
              setInput('');
              
              const assistantId = (Date.now() + 1).toString();
              setMessages(prev => [...prev, {
                id: assistantId,
                role: 'assistant',
                content: '',
                timestamp: new Date(),
              }]);
              
              try {
                const response = await fetch('/api/coach', {
                  method: 'POST',
                  body: formData,
                });
                
                const reader = response.body?.getReader();
                const decoder = new TextDecoder();
                let patterns: string[] = [];
                
                if (reader) {
                  while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');
                    
                    for (const line of lines) {
                      if (line.startsWith('data: ')) {
                        try {
                          const data = JSON.parse(line.slice(6));
                          if (data.text) {
                            setMessages(prev => prev.map(m =>
                              m.id === assistantId
                                ? { ...m, content: m.content + data.text }
                                : m
                            ));
                          }
                          if (data.patterns) patterns = data.patterns;
                          if (data.done && patterns.length > 0) {
                            setMessages(prev => prev.map(m =>
                              m.id === assistantId ? { ...m, patterns } : m
                            ));
                          }
                        } catch {}
                      }
                    }
                  }
                }
              } catch (error) {
                console.error('Upload error:', error);
                setMessages(prev => prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: 'Sorry, I had trouble with that file. Try again?' }
                    : m
                ));
              } finally {
                setIsLoading(false);
                e.target.value = '';
              }
            }}
          />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What's happening?"
            rows={1}
          />
          <button
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim()}
            className="send-btn"
          >
            ➤
          </button>
        </div>
        {messages.length > 0 && messages.some(m => m.patterns && m.patterns.length > 0) && (
          <div className="response-options">
            <button 
              className="help-respond-btn"
              onClick={() => {
                sendMessage(`Help me respond to this calmly. Keep it brief - no JADE (Justify, Argue, Defend, Explain). Just the facts, no emotion.`);
              }}
            >
              ✍️ Help me respond
            </button>
            <button 
              className="no-respond-btn"
              onClick={() => {
                const lastPattern = messages.filter(m => m.patterns && m.patterns.length > 0).pop();
                const patternName = lastPattern?.patterns?.[0] || 'manipulation';
                sendMessage(`I'm choosing not to respond to that ${patternName.toLowerCase()}. Silence is my power.`);
              }}
            >
              🚫 I'm not responding
            </button>
          </div>
        )}
      </div>

      {/* Regulate Modal - Enhanced Somatic Healing */}
      {showRegulate && (
        <div className="regulate-overlay" onClick={() => setShowRegulate(false)}>
          <div className="regulate-modal" onClick={(e) => e.stopPropagation()}>
            <button className="regulate-close" onClick={() => setShowRegulate(false)}>×</button>
            
            {regulateMode === 'menu' && (
              <div className="regulate-menu">
                <h2>🌿 Restore</h2>
                <p>You can't pour from an empty cup</p>
                <div className="regulate-options">
                  <button onClick={() => setRegulateMode('breathe')} className="regulate-option">
                    <span>🫁</span>
                    <div>
                      <strong>Breathe</strong>
                      <p>Calm your nervous system</p>
                    </div>
                  </button>
                  <button onClick={() => { setBodyStep(0); setRegulateMode('body'); }} className="regulate-option">
                    <span>💆</span>
                    <div>
                      <strong>Body Scan</strong>
                      <p>Release stored tension</p>
                    </div>
                  </button>
                  <button onClick={() => setRegulateMode('ground')} className="regulate-option">
                    <span>🌳</span>
                    <div>
                      <strong>Ground</strong>
                      <p>Come back to now</p>
                    </div>
                  </button>
                  <button onClick={() => { setShakeSeconds(30); setRegulateMode('shake'); }} className="regulate-option">
                    <span>🦋</span>
                    <div>
                      <strong>Shake It Out</strong>
                      <p>Release the energy</p>
                    </div>
                  </button>
                  <button onClick={() => { setReleaseText(''); setRegulateMode('release'); }} className="regulate-option">
                    <span>🔥</span>
                    <div>
                      <strong>Write & Release</strong>
                      <p>Let it go</p>
                    </div>
                  </button>
                  <button onClick={() => setRegulateMode('affirm')} className="regulate-option">
                    <span>💚</span>
                    <div>
                      <strong>Affirm</strong>
                      <p>Words of truth</p>
                    </div>
                  </button>
                  <button onClick={() => setRegulateMode('kids')} className="regulate-option kids-option">
                    <span>💛</span>
                    <div>
                      <strong>For Your Kids</strong>
                      <p>Ideas to make them smile</p>
                    </div>
                  </button>
                  <button onClick={() => setRegulateMode('gratitude')} className="regulate-option">
                    <span>✨</span>
                    <div>
                      <strong>Gratitude</strong>
                      <p>Find the light</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {regulateMode === 'breathe' && (
              <div className="breathe-mode">
                <div className="breathe-selector">
                  <button 
                    className={`breathe-type ${breatheType === 'box' ? 'active' : ''}`}
                    onClick={() => setBreatheType('box')}
                  >
                    Box
                  </button>
                  <button 
                    className={`breathe-type ${breatheType === '478' ? 'active' : ''}`}
                    onClick={() => setBreatheType('478')}
                  >
                    4-7-8
                  </button>
                  <button 
                    className={`breathe-type ${breatheType === 'sigh' ? 'active' : ''}`}
                    onClick={() => setBreatheType('sigh')}
                  >
                    Sigh
                  </button>
                </div>
                <p className="breathe-desc">{breathingTypes[breatheType].desc}</p>
                <div className={`breathe-circle ${breathePhase}`}>
                  <span className="breathe-instruction">
                    {breathePhase === 'inhale' ? 'Breathe in' : 
                     breathePhase === 'hold' || breathePhase === 'hold2' ? 'Hold' : 
                     'Breathe out'}
                  </span>
                  <span className="breathe-counter">{breatheCount}</span>
                </div>
                <button onClick={() => setRegulateMode('menu')} className="back-btn">← Back</button>
              </div>
            )}

            {regulateMode === 'ground' && (
              <div className="ground-mode">
                <div className="ground-step">
                  <span className="ground-icon">{groundingSteps[groundStep].icon}</span>
                  <h3>{groundingSteps[groundStep].sense}</h3>
                  <p>{groundingSteps[groundStep].instruction}</p>
                </div>
                <div className="ground-nav">
                  <button onClick={() => setGroundStep(Math.max(0, groundStep - 1))} disabled={groundStep === 0}>Previous</button>
                  <span>{groundStep + 1} / 5</span>
                  <button onClick={() => groundStep < 4 ? setGroundStep(groundStep + 1) : setRegulateMode('menu')}>
                    {groundStep < 4 ? 'Next' : 'Done'}
                  </button>
                </div>
                <button onClick={() => setRegulateMode('menu')} className="back-btn">← Back</button>
              </div>
            )}

            {regulateMode === 'body' && (
              <div className="body-mode">
                <div className="body-step">
                  <span className="body-icon">{bodyScanSteps[bodyStep].icon}</span>
                  <h3>{bodyScanSteps[bodyStep].area}</h3>
                  <p>{bodyScanSteps[bodyStep].instruction}</p>
                </div>
                <div className="body-progress">
                  {bodyScanSteps.map((_, i) => (
                    <span key={i} className={`body-dot ${i <= bodyStep ? 'active' : ''}`} />
                  ))}
                </div>
                <div className="ground-nav">
                  <button onClick={() => setBodyStep(Math.max(0, bodyStep - 1))} disabled={bodyStep === 0}>Previous</button>
                  <button onClick={() => bodyStep < bodyScanSteps.length - 1 ? setBodyStep(bodyStep + 1) : setRegulateMode('menu')}>
                    {bodyStep < bodyScanSteps.length - 1 ? 'Next' : 'Complete'}
                  </button>
                </div>
                <button onClick={() => setRegulateMode('menu')} className="back-btn">← Back</button>
              </div>
            )}

            {regulateMode === 'shake' && (
              <div className="shake-mode">
                <h3>Shake It Out</h3>
                <p className="shake-instruction">
                  Stand up if you can. Shake your hands, arms, legs - let your whole body move. 
                  This releases the stress energy stored in your muscles.
                </p>
                <div className="shake-timer">
                  <span className="shake-emoji">🦋</span>
                  <span className="shake-seconds">{shakeSeconds}</span>
                  <span className="shake-label">seconds</span>
                </div>
                {shakeSeconds === 0 && (
                  <div className="shake-complete">
                    <p>Notice how your body feels now. Lighter? Calmer?</p>
                    <button onClick={() => setShakeSeconds(30)} className="shake-again">Go again</button>
                  </div>
                )}
                <button onClick={() => setRegulateMode('menu')} className="back-btn">← Back</button>
              </div>
            )}

            {regulateMode === 'release' && (
              <div className="release-mode">
                <h3>Write & Release</h3>
                <p className="release-instruction">
                  Type everything you wish you could say. Get it all out. 
                  No one will ever see this.
                </p>
                <textarea 
                  className="release-textarea"
                  value={releaseText}
                  onChange={(e) => setReleaseText(e.target.value)}
                  placeholder="Let it all out..."
                  rows={6}
                />
                {releaseText.length > 0 && (
                  <button 
                    className="release-burn"
                    onClick={() => {
                      setReleaseText('');
                    }}
                  >
                    🔥 Release & Let Go
                  </button>
                )}
                {releaseText === '' && releaseText !== undefined && (
                  <p className="release-done">Released. Those words no longer have power over you.</p>
                )}
                <button onClick={() => setRegulateMode('menu')} className="back-btn">← Back</button>
              </div>
            )}

            {regulateMode === 'affirm' && (
              <div className="affirm-mode">
                <div className="affirmation">
                  <p className="affirm-text">{currentAffirmation.text}</p>
                  <p className="affirm-subtext">{currentAffirmation.subtext}</p>
                </div>
                <button onClick={nextAffirmation} className="next-affirm">Another →</button>
                <button onClick={() => setRegulateMode('menu')} className="back-btn">← Back</button>
              </div>
            )}

            {regulateMode === 'kids' && (
              <div className="kids-mode">
                <div className="kids-card">
                  <span className="kids-icon">💛</span>
                  <span className="age-badge">{currentKidIdea.age}</span>
                  <h3>{currentKidIdea.idea}</h3>
                  <p>{currentKidIdea.desc}</p>
                </div>
                <button onClick={nextKidIdea} className="next-affirm">Another idea →</button>
                <p className="kids-reminder">They feel your love even when you're apart.</p>
                <p className="kids-expert">Expert tip: Connection doesn't require perfection. Your presence - even imperfect - is what they need most.</p>
                <button onClick={() => setRegulateMode('menu')} className="back-btn">← Back</button>
              </div>
            )}

            {regulateMode === 'gratitude' && (
              <div className="gratitude-mode">
                <div className="gratitude-card">
                  <span className="gratitude-icon">✨</span>
                  <h3>{currentGratitude.prompt}</h3>
                  <p>{currentGratitude.followup}</p>
                </div>
                <button onClick={nextGratitude} className="next-affirm">Another prompt →</button>
                <button onClick={() => setRegulateMode('menu')} className="back-btn">← Back</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Safety Resources Modal */}
      <SafetyResources 
        isOpen={showSafetyResources} 
        onClose={() => {
          setShowSafetyResources(false);
          setSafetyTriggered(false);
        }}
        triggered={safetyTriggered}
      />

      {/* Morning Intention Modal */}
      {showMorningContent && (
        <div className="healing-overlay">
          <div className="healing-modal morning">
            <div className="healing-header">
              <span className="healing-time">🌅 Good Morning</span>
              <h2>Your Daily Intention</h2>
              <p>Take 30 seconds to set the tone for today</p>
            </div>
            <div className="healing-content">
              <p className="intention-text">
                {morningIntentions[new Date().getDay() % morningIntentions.length].intention}
              </p>
              <p className="intention-reflection">
                {morningIntentions[new Date().getDay() % morningIntentions.length].reflection}
              </p>
            </div>
            <div className="healing-education">
              <span className="edu-tag">Why this matters</span>
              <p>Morning intentions activate your prefrontal cortex - the rational brain - before stress can trigger your amygdala. You're literally choosing which neural pathways fire first today.</p>
              <p className="for-kids">💛 Your kids feel your energy the moment they see you. Starting regulated means they start regulated too.</p>
            </div>
            <div className="healing-actions">
              <button onClick={() => setShowMorningContent(false)} className="healing-btn primary">
                I receive this 💚
              </button>
              <button onClick={() => { setShowMorningContent(false); setShowRegulate(true); setRegulateMode('breathe'); }} className="healing-btn secondary">
                I need to breathe first
              </button>
            </div>
            <button onClick={() => setShowMorningContent(false)} className="healing-skip">
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* Evening Release Modal */}
      {showEveningContent && (
        <div className="healing-overlay">
          <div className="healing-modal evening">
            <div className="healing-header">
              <span className="healing-time">🌙 Good Evening</span>
              <h2>Release & Restore</h2>
              <p>Let go of what today held so tomorrow can be new</p>
            </div>
            <div className="healing-content">
              <p className="intention-text">
                {eveningReflections[new Date().getDay() % eveningReflections.length].reflection}
              </p>
              <p className="intention-reflection">
                {eveningReflections[new Date().getDay() % eveningReflections.length].prompt}
              </p>
            </div>
            <div className="healing-education">
              <span className="edu-tag">Why this matters</span>
              <p>Unprocessed stress gets stored in your body overnight, keeping your nervous system activated even during sleep. This simple practice signals safety to your brain: "The day is done. We made it."</p>
              <p className="for-kids">💛 Better sleep tonight means more patience tomorrow. The rested version of you is the parent your kids deserve.</p>
            </div>
            <div className="healing-actions">
              <button onClick={() => setShowEveningContent(false)} className="healing-btn primary">
                I release today 💚
              </button>
              <button onClick={() => { setShowEveningContent(false); setShowRegulate(true); setRegulateMode('body'); }} className="healing-btn secondary">
                Guide me through a body scan
              </button>
            </div>
            <button onClick={() => setShowEveningContent(false)} className="healing-skip">
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* Onboarding - WOW Experience */}
      {showOnboarding && user && (
        <OnboardingWow 
          userId={user.id}
          onComplete={() => {
            localStorage.setItem('p18_onboarding_complete', 'true');
            setShowOnboarding(false);
          }}
        />
      )}

      {/* What's New Modal */}
      {showWhatsNew && (
        <div className="modal-overlay" onClick={() => setShowWhatsNew(false)}>
          <div className="whats-new-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowWhatsNew(false)}>×</button>
            <h2>✨ What's New</h2>
            <p className="whats-new-intro">We're constantly improving Pattern 18 based on your feedback.</p>
            
            <div className="update-list">
              <div className="update-item">
                <span className="update-date">Dec 2024</span>
                <h4>📋 Case Filings & Order Reader</h4>
                <p>Upload court orders and we'll extract deadlines, action items, and requirements automatically. Track all filings in one place.</p>
              </div>
              <div className="update-item">
                <span className="update-date">Dec 2024</span>
                <h4>⚖️ Court Document Generator</h4>
                <p>Generate declarations, exhibit lists, pattern summaries, and incident timelines. Court-ready in minutes.</p>
              </div>
              <div className="update-item">
                <span className="update-date">Dec 2024</span>
                <h4>💬 Conversation History</h4>
                <p>Your coaching sessions are now saved automatically. Pick up right where you left off.</p>
              </div>
              <div className="update-item">
                <span className="update-date">Dec 2024</span>
                <h4>🌿 Healing Journey</h4>
                <p>Morning intentions, evening releases, and weekly healing challenges. Set reminders to build healing habits.</p>
              </div>
              <div className="update-item">
                <span className="update-date">Dec 2024</span>
                <h4>📱 Bulk Message Analyzer</h4>
                <p>Upload months of text messages at once. We'll scan for all manipulation patterns and help you document.</p>
              </div>
            </div>
            
            <p className="whats-new-footer">Have an idea? Tap "Feedback" in the menu!</p>
          </div>
        </div>
      )}

      {/* Before You Respond Pause Modal */}
      {showPauseModal && (
        <div className="modal-overlay">
          <div className="pause-modal">
            <div className="pause-icon">🌿</div>
            <h2>Before you respond...</h2>
            <p className="pause-message">
              I notice this message might have you activated. That's completely understandable given what you're dealing with.
            </p>
            <p className="pause-submessage">
              Taking 60 seconds to breathe can help you respond from a place of power, not reaction. Your future self (and your case) will thank you.
            </p>
            
            <div className="pause-buttons">
              <button 
                className="pause-breathe-btn"
                onClick={() => {
                  setShowPauseModal(false);
                  setShowRegulate(true);
                  setRegulateMode('breathe');
                  setBreatheType('box');
                }}
              >
                🌬️ Breathe First (60 sec)
              </button>
              <button 
                className="pause-continue-btn"
                onClick={() => {
                  setShowPauseModal(false);
                  if (pendingMessage) {
                    sendMessage(pendingMessage, true);
                    setPendingMessage(null);
                  }
                }}
              >
                I'm Okay, Continue
              </button>
            </div>
            
            <p className="pause-reminder">
              Remember: Every calm response is a win. Every reaction is ammunition for them.
            </p>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedback && (
        <div className="modal-overlay" onClick={() => setShowFeedback(false)}>
          <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowFeedback(false)}>×</button>
            
            {feedbackSent ? (
              <div className="feedback-success">
                <span className="success-icon">💚</span>
                <h2>Thank You!</h2>
                <p>Your feedback helps us build a better tool for survivors.</p>
                <button onClick={() => { setShowFeedback(false); setFeedbackSent(false); setFeedbackText(''); }} className="feedback-done-btn">
                  Done
                </button>
              </div>
            ) : (
              <>
                <h2>💬 We'd Love to Hear From You</h2>
                <p className="feedback-intro">Your feedback shapes Pattern 18. What's on your mind?</p>
                
                <div className="feedback-types">
                  <button 
                    className={`feedback-type ${feedbackType === 'feedback' ? 'active' : ''}`}
                    onClick={() => setFeedbackType('feedback')}
                  >
                    💭 General Feedback
                  </button>
                  <button 
                    className={`feedback-type ${feedbackType === 'feature' ? 'active' : ''}`}
                    onClick={() => setFeedbackType('feature')}
                  >
                    ✨ Feature Request
                  </button>
                  <button 
                    className={`feedback-type ${feedbackType === 'bug' ? 'active' : ''}`}
                    onClick={() => setFeedbackType('bug')}
                  >
                    🐛 Report a Bug
                  </button>
                </div>
                
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder={
                    feedbackType === 'feedback' ? "What's working? What could be better?" :
                    feedbackType === 'feature' ? "What would help you most? Describe your idea..." :
                    "What happened? What did you expect to happen?"
                  }
                  rows={5}
                />
                
                <button 
                  className="submit-feedback-btn"
                  disabled={!feedbackText.trim() || feedbackSending}
                  onClick={async () => {
                    setFeedbackSending(true);
                    try {
                      await supabase.from('feedback').insert({
                        user_id: user?.id,
                        type: feedbackType,
                        message: feedbackText,
                        created_at: new Date().toISOString(),
                      });
                      setFeedbackSent(true);
                    } catch (err) {
                      console.error('Feedback error:', err);
                    }
                    setFeedbackSending(false);
                  }}
                >
                  {feedbackSending ? 'Sending...' : 'Send Feedback'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Before You Respond Pause Modal */}
      {showPauseModal && (
        <div className="modal-overlay">
          <div className="pause-modal">
            <div className="pause-icon">💚</div>
            <h3>Before you respond...</h3>
            <p className="pause-text">
              I notice this message might have you activated. That's completely understandable 
              given what you're dealing with.
            </p>
            <p className="pause-text">
              Taking 60 seconds to regulate first helps you respond from a place of strength, 
              not reaction. Your calm is your superpower in court.
            </p>
            
            <div className="pause-buttons">
              <button 
                className="pause-btn-breathe"
                onClick={() => {
                  setShowPauseModal(false);
                  setShowRegulate(true);
                  setRegulateMode('breathe');
                }}
              >
                🌿 Breathe First (60 sec)
              </button>
              <button 
                className="pause-btn-continue"
                onClick={() => {
                  setShowPauseModal(false);
                  if (pendingMessage) {
                    sendMessage(pendingMessage, true);
                    setPendingMessage(null);
                  }
                }}
              >
                I'm Okay, Continue
              </button>
            </div>
            
            <p className="pause-reminder">
              Remember: One reactive text can undo months of good documentation.
            </p>
          </div>
        </div>
      )}

      {/* Unified Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => { setShowUploadModal(false); setUploadMode('choose'); setUploadedFile(null); setDetectedType(null); setPasteText(''); }}>
          <div className="upload-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setShowUploadModal(false); setUploadMode('choose'); setUploadedFile(null); setDetectedType(null); setPasteText(''); }}>×</button>
            
            {uploadMode === 'choose' && (
              <>
                <div className="upload-header">
                  <span className="upload-emoji">📱</span>
                  <h2>What do you have?</h2>
                  <p>I'll analyze it and remember what matters</p>
                </div>
                
                <div className="upload-options">
                  <label className="upload-option">
                    <input 
                      type="file" 
                      accept="image/*" 
                      hidden 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleUploadFile(file, 'screenshot');
                        }
                      }}
                    />
                    <div className="option-icon">📸</div>
                    <div className="option-text">
                      <div className="option-title">Screenshot</div>
                      <div className="option-desc">Photo of a text or message</div>
                    </div>
                  </label>
                  
                  <div 
                    className="upload-option"
                    onClick={() => setUploadMode('paste' as any)}
                  >
                    <div className="option-icon">📝</div>
                    <div className="option-text">
                      <div className="option-title">Paste text</div>
                      <div className="option-desc">Copy and paste a message</div>
                    </div>
                  </div>
                  
                  <label className="upload-option">
                    <input 
                      type="file" 
                      accept=".pdf,.doc,.docx,image/*" 
                      hidden 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const type = detectFileType(file);
                          if (type === 'unknown') {
                            setUploadedFile(file);
                            setUploadMode('clarify' as any);
                          } else if (type === 'court_order') {
                            handleUploadFile(file, 'court_order');
                          } else {
                            handleUploadFile(file, 'screenshot');
                          }
                        }
                      }}
                    />
                    <div className="option-icon">📋</div>
                    <div className="option-text">
                      <div className="option-title">Court order / Legal doc</div>
                      <div className="option-desc">I'll learn your rules & schedule</div>
                    </div>
                  </label>
                  
                  <label className="upload-option">
                    <input 
                      type="file" 
                      accept=".csv,.txt,.pdf" 
                      hidden 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleUploadFile(file, 'message_export');
                        }
                      }}
                    />
                    <div className="option-icon">📦</div>
                    <div className="option-text">
                      <div className="option-title">Message history</div>
                      <div className="option-desc">CSV or text export from your phone</div>
                    </div>
                  </label>
                </div>
              </>
            )}
            
            {uploadMode === ('paste' as any) && (
              <>
                <div className="upload-header">
                  <span className="upload-emoji">📝</span>
                  <h2>Paste the message</h2>
                  <p>I'll analyze it and help you respond (or not)</p>
                </div>
                
                <textarea
                  className="paste-textarea"
                  placeholder="Paste the message here..."
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={6}
                  autoFocus
                />
                
                <div className="paste-buttons">
                  <button 
                    className="paste-back"
                    onClick={() => { setUploadMode('choose'); setPasteText(''); }}
                  >
                    ← Back
                  </button>
                  <button 
                    className="paste-submit"
                    disabled={!pasteText.trim()}
                    onClick={handlePasteSubmit}
                  >
                    Analyze This
                  </button>
                </div>
              </>
            )}
            
            {uploadMode === ('clarify' as any) && uploadedFile && (
              <>
                <div className="upload-header">
                  <span className="upload-emoji">🤔</span>
                  <h2>What is this?</h2>
                  <p>Help me understand so I process it correctly</p>
                </div>
                
                <p className="clarify-filename">{uploadedFile.name}</p>
                
                <div className="clarify-options">
                  <button 
                    className="clarify-btn"
                    onClick={() => handleUploadFile(uploadedFile, 'court_order')}
                  >
                    <span>📋</span>
                    <span>Court Order / Legal Document</span>
                  </button>
                  <button 
                    className="clarify-btn"
                    onClick={() => handleUploadFile(uploadedFile, 'message_export')}
                  >
                    <span>📦</span>
                    <span>Message History / Export</span>
                  </button>
                  <button 
                    className="clarify-btn"
                    onClick={() => handleUploadFile(uploadedFile, 'screenshot')}
                  >
                    <span>📸</span>
                    <span>Screenshot / Other</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Save Evidence Modal */}
      {showSaveModal && saveModalData && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="save-modal" onClick={e => e.stopPropagation()}>
            <h3>Save Evidence with Details</h3>
            <p className="modal-subtitle">Adding details makes your documentation court-ready</p>
            
            <div className="form-group">
              <label>Original Message</label>
              <div className="quote-preview">
                "{saveModalData.userMsg?.content?.slice(0, 300) || 'No message'}"
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Message Date</label>
                <input
                  type="date"
                  value={evidenceDetails.messageDate}
                  onChange={e => setEvidenceDetails(prev => ({ ...prev, messageDate: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Time (optional)</label>
                <input
                  type="time"
                  value={evidenceDetails.messageTime}
                  onChange={e => setEvidenceDetails(prev => ({ ...prev, messageTime: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Source</label>
                <select
                  value={evidenceDetails.sourcePlatform}
                  onChange={e => setEvidenceDetails(prev => ({ ...prev, sourcePlatform: e.target.value }))}
                >
                  <option value="text">Text Message</option>
                  <option value="imessage">iMessage</option>
                  <option value="email">Email</option>
                  <option value="ofw">OurFamilyWizard</option>
                  <option value="talkingparents">TalkingParents</option>
                  <option value="appclose">AppClose</option>
                  <option value="voicemail">Voicemail</option>
                  <option value="social">Social Media</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Sender</label>
                <input
                  type="text"
                  placeholder="Who sent this?"
                  value={evidenceDetails.senderName}
                  onChange={e => setEvidenceDetails(prev => ({ ...prev, senderName: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Context Notes (optional)</label>
              <textarea
                placeholder="Any important context? (e.g., 'This was after I asked about pickup time')"
                value={evidenceDetails.contextNotes}
                onChange={e => setEvidenceDetails(prev => ({ ...prev, contextNotes: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="patterns-preview">
              <label>Patterns Identified</label>
              <div className="pattern-tags">
                {saveModalData.msg.patterns?.map(p => (
                  <span key={p} className="pattern-tag">{p}</span>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowSaveModal(false)} className="cancel-btn">
                Cancel
              </button>
              <button
                onClick={() => saveToEvidence(saveModalData.msg, saveModalData.userMsg, evidenceDetails)}
                disabled={savingEvidence === saveModalData.msg.id}
                className="save-btn"
              >
                {savingEvidence === saveModalData.msg.id ? 'Saving...' : 'Save Evidence'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #f5f7f6;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* Overlay */
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 40;
        }

        /* Celebration Toast */
        .celebration-toast {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          animation: slideDown 0.4s ease, fadeOut 0.5s ease 3.5s forwards;
        }
        .celebration-content {
          background: linear-gradient(135deg, #1a3a2f 0%, #2d5a4a 100%);
          color: white;
          padding: 16px 28px;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.25);
          text-align: center;
        }
        .celebration-title {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .celebration-subtitle {
          font-size: 14px;
          opacity: 0.9;
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        @keyframes fadeOut {
          to {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
          }
        }

        /* Sidebar */
        .sidebar {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          width: 280px;
          background: #1a3a2f;
          z-index: 50;
          transform: translateX(-100%);
          transition: transform 0.3s ease;
        }
        .sidebar.open { transform: translateX(0); }
        .sidebar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          color: white;
          font-weight: 600;
        }
        .sidebar-logo {
          background: rgba(255,255,255,0.15);
          padding: 6px 10px;
          border-radius: 6px;
          font-weight: 700;
        }
        .close-btn {
          background: none;
          border: none;
          color: white;
          font-size: 28px;
          cursor: pointer;
        }
        .new-chat-btn {
          margin: 12px 16px;
          padding: 12px 16px;
          background: #14b8a6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          text-align: center;
        }
        .new-chat-btn:hover {
          background: #0d9488;
        }
        .history-section {
          border-top: 1px solid rgba(255,255,255,0.1);
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .history-toggle {
          width: 100%;
          padding: 12px 16px;
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.7);
          font-size: 13px;
          text-align: left;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .history-toggle:hover {
          color: white;
        }
        .toggle-arrow {
          transition: transform 0.2s;
        }
        .toggle-arrow.open {
          transform: rotate(90deg);
        }
        .history-list {
          max-height: 200px;
          overflow-y: auto;
          padding: 0 8px 8px;
        }
        .history-item {
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;
          margin-bottom: 4px;
          position: relative;
          background: rgba(255,255,255,0.05);
        }
        .history-item:hover {
          background: rgba(255,255,255,0.1);
        }
        .history-item.active {
          background: rgba(20, 184, 166, 0.3);
        }
        .history-item-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }
        .history-title {
          font-size: 13px;
          color: white;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }
        .history-date {
          font-size: 11px;
          color: rgba(255,255,255,0.5);
          white-space: nowrap;
        }
        .history-patterns {
          font-size: 11px;
          color: #5eead4;
          display: block;
          margin-top: 4px;
        }
        .history-delete {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: rgba(255,255,255,0.3);
          font-size: 18px;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .history-item:hover .history-delete {
          opacity: 1;
        }
        .history-delete:hover {
          color: #f87171;
        }
        .nav {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: rgba(255,255,255,0.7);
          font-size: 15px;
          cursor: pointer;
          text-align: left;
          width: 100%;
          transition: all 0.15s ease;
        }
        .nav-item:hover {
          background: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.9);
        }
        .nav-item.active {
          background: rgba(20, 184, 166, 0.2);
          color: #5eead4;
          font-weight: 500;
        }
        .nav-item.logout { 
          color: rgba(252, 165, 165, 0.8); 
        }
        .nav-item.logout:hover { 
          color: #fca5a5;
          background: rgba(239, 68, 68, 0.1);
        }
        .nav-divider {
          height: 1px;
          background: rgba(255,255,255,0.1);
          margin: 12px 0;
        }

        /* Header */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          background: #1a3a2f;
          color: white;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .menu-btn {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo {
          background: rgba(255,255,255,0.15);
          padding: 8px 12px;
          border-radius: 8px;
          font-weight: 700;
        }
        .brand-text {
          display: flex;
          flex-direction: column;
        }
        .brand-name { font-weight: 600; }
        .brand-tag { font-size: 12px; opacity: 0.7; }
        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .court-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(251,191,36,0.2);
          padding: 6px 12px;
          border-radius: 20px;
          cursor: pointer;
          font-size: 13px;
        }
        .court-days {
          background: #fbbf24;
          color: #1a3a2f;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 700;
        }
        .new-chat-header-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255,255,255,0.15);
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .new-chat-header-btn:hover {
          background: rgba(255,255,255,0.25);
        }
        .evidence-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.1);
          padding: 6px 12px;
          border-radius: 20px;
          cursor: pointer;
          font-size: 13px;
        }
        .evidence-count {
          background: #14b8a6;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 700;
        }

        /* Chat Area */
        .chat-area {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        /* Welcome */
        .welcome {
          max-width: 600px;
          margin: 0 auto;
          text-align: center;
          padding: 20px;
        }
        .welcome-heart {
          font-size: 48px;
          margin-bottom: 16px;
        }
        .welcome-title {
          font-size: 28px;
          font-weight: 600;
          color: #1a3a2f;
          margin-bottom: 12px;
        }
        .welcome-text {
          color: #666;
          line-height: 1.6;
          margin-bottom: 20px;
        }
        .tagline {
          display: flex;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 32px;
        }
        .tag {
          background: #1a3a2f;
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
        }
        .quick-actions {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .quick-actions h3 {
          color: #666;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 16px;
        }
        .actions-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .action-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 18px 20px;
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          border-radius: 16px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
        }
        .action-card:hover {
          border-color: #14b8a6;
          background: #f0fdfa;
          transform: translateX(4px);
        }
        .action-card.primary-action {
          background: linear-gradient(135deg, #f0fdfa 0%, #d1fae5 100%);
          border: 2px solid #14b8a6;
        }
        .action-icon { font-size: 28px; }
        .action-title { font-weight: 600; color: #1a3a2f; font-size: 16px; }
        .action-desc { font-size: 14px; color: #666; margin-top: 2px; }
        .breathe-btn {
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          border: none;
          padding: 12px 24px;
          border-radius: 24px;
          font-size: 15px;
          cursor: pointer;
          color: #065f46;
          font-weight: 500;
          transition: transform 0.2s;
        }
        .breathe-btn:hover {
          transform: scale(1.02);
          background: linear-gradient(135deg, #a7f3d0 0%, #6ee7b7 100%);
        }
        .recent-chats-welcome {
          margin-top: 24px;
          text-align: center;
        }
        .recent-label {
          font-size: 13px;
          color: #666;
          display: block;
          margin-bottom: 10px;
        }
        .recent-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
        }
        .recent-chip {
          background: white;
          border: 1px solid #e5e7eb;
          padding: 8px 14px;
          border-radius: 16px;
          font-size: 13px;
          color: #444;
          cursor: pointer;
          transition: all 0.2s;
        }
        .recent-chip:hover {
          border-color: #14b8a6;
          color: #14b8a6;
        }
        .bulk-analyzer-promo {
          display: flex;
          align-items: center;
          gap: 14px;
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          padding: 16px 20px;
          border-radius: 14px;
          cursor: pointer;
          margin-bottom: 16px;
          transition: transform 0.2s;
        }
        .bulk-analyzer-promo:hover {
          transform: scale(1.01);
        }
        .promo-icon {
          font-size: 28px;
        }
        .promo-content {
          flex: 1;
        }
        .promo-title {
          font-weight: 600;
          color: #065f46;
          font-size: 15px;
          margin-bottom: 2px;
        }
        .promo-desc {
          font-size: 13px;
          color: #047857;
        }
        .promo-arrow {
          color: #065f46;
          font-size: 20px;
        }

        /* Messages */
        .messages {
          max-width: 800px;
          margin: 0 auto;
        }
        .message {
          margin-bottom: 16px;
        }
        .message.user {
          display: flex;
          justify-content: flex-end;
        }
        .message.user .bubble {
          background: #1a3a2f;
          color: white;
          border-radius: 18px 18px 4px 18px;
        }
        .message.assistant .bubble {
          background: white;
          color: #333;
          border-radius: 18px 18px 18px 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .bubble {
          padding: 12px 16px;
          max-width: 80%;
          white-space: pre-wrap;
          line-height: 1.5;
        }
        .message-actions {
          margin-top: 8px;
          padding-left: 4px;
        }
        .patterns {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 8px;
        }
        .pattern-tag {
          background: #fef3c7;
          color: #92400e;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }
        .action-buttons {
          display: flex;
          gap: 8px;
        }
        .action-btn {
          background: #f3f4f6;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
        }
        .action-btn.save {
          background: #14b8a6;
          color: white;
        }
        .saved-badge {
          color: #059669;
          font-size: 13px;
          font-weight: 500;
        }

        /* Input Area */
        .input-area {
          padding: 16px 20px;
          background: white;
          border-top: 1px solid #eee;
        }
        .input-container {
          display: flex;
          align-items: center;
          gap: 12px;
          max-width: 800px;
          margin: 0 auto;
        }
        .attach-btn {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          padding: 8px;
        }
        .input-container textarea {
          flex: 1;
          padding: 12px 16px;
          border-radius: 24px;
          border: 1px solid #ddd;
          font-size: 16px;
          resize: none;
          outline: none;
          font-family: inherit;
        }
        .send-btn {
          background: #1a3a2f;
          color: white;
          border: none;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 18px;
        }
        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .response-options {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-top: 12px;
          flex-wrap: wrap;
        }
        .help-respond-btn {
          background: linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%);
          border: none;
          padding: 10px 18px;
          border-radius: 20px;
          font-size: 14px;
          color: #0f766e;
          cursor: pointer;
          font-weight: 500;
        }
        .help-respond-btn:hover {
          background: linear-gradient(135deg, #99f6e4 0%, #5eead4 100%);
        }
        .no-respond-btn {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: none;
          padding: 10px 18px;
          border-radius: 20px;
          font-size: 14px;
          color: #92400e;
          cursor: pointer;
          font-weight: 500;
        }
        .no-respond-btn:hover {
          background: linear-gradient(135deg, #fde68a 0%, #fcd34d 100%);
        }

        /* Regulate Modal */
        .regulate-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }
        .regulate-modal {
          background: white;
          border-radius: 24px;
          padding: 32px;
          max-width: 440px;
          width: 90%;
          position: relative;
          max-height: 90vh;
          overflow-y: auto;
        }
        .regulate-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #999;
        }
        .regulate-menu h2 {
          text-align: center;
          margin-bottom: 8px;
        }
        .regulate-menu > p {
          text-align: center;
          color: #666;
          margin-bottom: 24px;
        }
        .regulate-options {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        .regulate-option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
        }
        .regulate-option:hover {
          background: #f0fdf4;
          border-color: #14b8a6;
        }
        .regulate-option span {
          font-size: 28px;
        }
        .regulate-option strong {
          display: block;
          margin-bottom: 2px;
        }
        .regulate-option p {
          margin: 0;
          font-size: 13px;
          color: #666;
        }
        .back-btn {
          display: block;
          margin: 20px auto 0;
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
        }

        /* Breathe Mode */
        .breathe-mode {
          text-align: center;
          padding: 20px;
        }
        .breathe-circle {
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          color: white;
          font-weight: 600;
          transition: transform 4s ease-in-out;
        }
        .breathe-circle.inhale { transform: scale(1.2); }
        .breathe-circle.hold { transform: scale(1.2); }
        .breathe-circle.exhale { transform: scale(1); }

        /* Ground Mode */
        .ground-mode {
          text-align: center;
        }
        .ground-step {
          padding: 24px;
        }
        .ground-icon {
          font-size: 48px;
          display: block;
          margin-bottom: 16px;
        }
        .ground-step h3 {
          color: #1a3a2f;
          margin-bottom: 8px;
        }
        .ground-step p {
          color: #666;
        }
        .ground-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-top: 1px solid #eee;
        }
        .ground-nav button {
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
        }
        .ground-nav button:first-child {
          background: #f3f4f6;
          border: none;
        }
        .ground-nav button:last-child {
          background: #1a3a2f;
          color: white;
          border: none;
        }
        .ground-nav button:disabled {
          opacity: 0.4;
        }

        /* Affirm Mode */
        .affirm-mode {
          text-align: center;
        }
        .affirmation {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border-radius: 16px;
          padding: 32px 24px;
          margin-bottom: 20px;
        }
        .affirm-text {
          font-size: 22px;
          color: #1a3a2f;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .affirm-subtext {
          color: #166534;
          font-size: 15px;
        }
        .next-affirm {
          background: #1a3a2f;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 500;
        }

        /* Enhanced Breathe Mode */
        .breathe-selector {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 12px;
        }
        .breathe-type {
          padding: 8px 16px;
          border: 1px solid #ddd;
          border-radius: 20px;
          background: white;
          cursor: pointer;
          font-size: 13px;
        }
        .breathe-type.active {
          background: #1a3a2f;
          color: white;
          border-color: #1a3a2f;
        }
        .breathe-desc {
          color: #666;
          font-size: 13px;
          margin-bottom: 20px;
        }
        .breathe-circle {
          flex-direction: column;
        }
        .breathe-instruction {
          font-size: 18px;
        }
        .breathe-counter {
          font-size: 48px;
          font-weight: 300;
          margin-top: 8px;
        }
        .breathe-circle.hold2 { transform: scale(1); }

        /* Body Scan Mode */
        .body-mode {
          text-align: center;
        }
        .body-step {
          padding: 24px;
          min-height: 200px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .body-icon {
          font-size: 56px;
          display: block;
          margin-bottom: 16px;
        }
        .body-step h3 {
          color: #1a3a2f;
          font-size: 24px;
          margin-bottom: 12px;
        }
        .body-step p {
          color: #555;
          line-height: 1.6;
          font-size: 15px;
        }
        .body-progress {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin: 16px 0;
        }
        .body-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #ddd;
          transition: background 0.3s;
        }
        .body-dot.active {
          background: #14b8a6;
        }

        /* Shake Mode */
        .shake-mode {
          text-align: center;
          padding: 20px;
        }
        .shake-mode h3 {
          color: #1a3a2f;
          margin-bottom: 12px;
        }
        .shake-instruction {
          color: #666;
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 24px;
        }
        .shake-timer {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin: 24px 0;
        }
        .shake-emoji {
          font-size: 64px;
          animation: shake 0.5s infinite;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(-5px) rotate(-5deg); }
          75% { transform: translateX(5px) rotate(5deg); }
        }
        .shake-seconds {
          font-size: 56px;
          font-weight: 700;
          color: #1a3a2f;
        }
        .shake-label {
          color: #666;
          font-size: 14px;
        }
        .shake-complete {
          margin-top: 16px;
        }
        .shake-complete p {
          color: #666;
          margin-bottom: 12px;
        }
        .shake-again {
          background: #14b8a6;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
        }

        /* Release Mode */
        .release-mode {
          text-align: center;
          padding: 20px;
        }
        .release-mode h3 {
          color: #1a3a2f;
          margin-bottom: 8px;
        }
        .release-instruction {
          color: #666;
          font-size: 14px;
          margin-bottom: 16px;
        }
        .release-textarea {
          width: 100%;
          padding: 16px;
          border: 1px solid #ddd;
          border-radius: 12px;
          font-size: 15px;
          font-family: inherit;
          resize: none;
          margin-bottom: 16px;
        }
        .release-textarea:focus {
          outline: none;
          border-color: #14b8a6;
        }
        .release-burn {
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          color: white;
          border: none;
          padding: 14px 28px;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .release-burn:hover {
          transform: scale(1.05);
        }
        .release-done {
          color: #14b8a6;
          font-style: italic;
          margin-top: 16px;
        }

        /* Kids Mode */
        .kids-mode {
          text-align: center;
          padding: 20px;
        }
        .kids-card {
          background: linear-gradient(135deg, #fef9c3 0%, #fef08a 100%);
          border-radius: 16px;
          padding: 28px 24px;
          margin-bottom: 20px;
        }
        .kids-icon {
          font-size: 48px;
          display: block;
          margin-bottom: 12px;
        }
        .kids-card h3 {
          font-size: 20px;
          color: #854d0e;
          margin-bottom: 10px;
        }
        .kids-card p {
          color: #a16207;
          font-size: 15px;
          line-height: 1.5;
        }
        .kids-reminder {
          color: #666;
          font-size: 13px;
          font-style: italic;
          margin: 16px 0 8px;
        }
        .kids-expert {
          color: #14b8a6;
          font-size: 12px;
          margin: 0 0 8px;
          padding: 10px;
          background: #f0fdf4;
          border-radius: 8px;
        }
        .age-badge {
          display: inline-block;
          background: #854d0e;
          color: white;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 12px;
          margin-bottom: 12px;
        }
        .kids-option {
          background: #fefce8 !important;
          border-color: #fef08a !important;
        }

        /* Gratitude Mode */
        .gratitude-mode {
          text-align: center;
          padding: 20px;
        }
        .gratitude-card {
          background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
          border-radius: 16px;
          padding: 28px 24px;
          margin-bottom: 20px;
        }
        .gratitude-icon {
          font-size: 48px;
          display: block;
          margin-bottom: 12px;
        }
        .gratitude-card h3 {
          font-size: 20px;
          color: #6b21a8;
          margin-bottom: 10px;
        }
        .gratitude-card p {
          color: #7c3aed;
          font-size: 15px;
        }

        /* Healing Modals (Morning/Evening) */
        .healing-overlay {
          position: fixed;
          inset: 0;
          background: rgba(26, 58, 47, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: 20px;
        }
        .healing-modal {
          background: white;
          border-radius: 24px;
          padding: 32px;
          max-width: 440px;
          width: 100%;
          text-align: center;
        }
        .healing-modal.morning {
          background: linear-gradient(180deg, #fef9c3 0%, white 30%);
        }
        .healing-modal.evening {
          background: linear-gradient(180deg, #e0e7ff 0%, white 30%);
        }
        .healing-header {
          margin-bottom: 24px;
        }
        .healing-time {
          font-size: 14px;
          color: #666;
          display: block;
          margin-bottom: 8px;
        }
        .healing-header h2 {
          font-size: 24px;
          color: #1a3a2f;
          margin-bottom: 8px;
        }
        .healing-header p {
          color: #666;
          font-size: 15px;
        }
        .healing-content {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 20px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
        }
        .intention-text {
          font-size: 22px;
          color: #1a3a2f;
          font-weight: 600;
          line-height: 1.4;
          margin-bottom: 12px;
        }
        .intention-reflection {
          color: #666;
          font-size: 15px;
          font-style: italic;
        }
        .healing-education {
          background: #f0fdf4;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
          text-align: left;
        }
        .healing-education .edu-tag {
          display: inline-block;
          background: #14b8a6;
          color: white;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 10px;
        }
        .healing-education p {
          font-size: 13px;
          color: #444;
          line-height: 1.6;
          margin-bottom: 10px;
        }
        .healing-education .for-kids {
          background: #fef9c3;
          padding: 10px 12px;
          border-radius: 8px;
          color: #854d0e;
          margin-bottom: 0;
        }
        .healing-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .healing-btn {
          padding: 14px 24px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          border: none;
        }
        .healing-btn.primary {
          background: #1a3a2f;
          color: white;
        }
        .healing-btn.secondary {
          background: #f3f4f6;
          color: #1a3a2f;
        }
        .healing-skip {
          background: none;
          border: none;
          color: #999;
          font-size: 13px;
          margin-top: 16px;
          cursor: pointer;
        }

        /* Onboarding */
        .onboarding-overlay {
          position: fixed;
          inset: 0;
          background: rgba(26, 58, 47, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: 20px;
        }
        .onboarding-modal {
          background: white;
          border-radius: 24px;
          padding: 40px 32px 32px;
          max-width: 420px;
          width: 100%;
          text-align: center;
        }
        .onboarding-step {
          min-height: 200px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .onboarding-icon {
          font-size: 56px;
          margin-bottom: 20px;
        }
        .onboarding-step h2 {
          font-size: 24px;
          color: #1a3a2f;
          margin: 0 0 12px;
        }
        .onboarding-step p {
          color: #333;
          font-size: 16px;
          line-height: 1.5;
          margin: 0 0 8px;
        }
        .onboarding-sub {
          color: #666 !important;
          font-size: 14px !important;
        }
        .onboarding-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 32px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }
        .onboarding-dots {
          display: flex;
          gap: 8px;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ddd;
        }
        .dot.active {
          background: #14b8a6;
        }
        .onboarding-btn {
          background: #f3f4f6;
          border: none;
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          color: #1a3a2f;
        }
        .onboarding-btn.primary {
          background: #1a3a2f;
          color: white;
        }
        .onboarding-skip {
          background: none;
          border: none;
          color: #999;
          font-size: 13px;
          margin-top: 16px;
          cursor: pointer;
        }

        /* Modal Overlay (shared) */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: 20px;
        }
        .modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          font-size: 28px;
          color: #999;
          cursor: pointer;
        }

        /* Before You Respond Pause Modal */
        .pause-modal {
          background: white;
          border-radius: 20px;
          padding: 32px;
          max-width: 420px;
          width: 100%;
          text-align: center;
          animation: modalSlideUp 0.3s ease;
        }
        @keyframes modalSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .pause-icon {
          font-size: 48px;
          margin-bottom: 16px;
          animation: gentlePulse 2s ease-in-out infinite;
        }
        @keyframes gentlePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .pause-modal h3 {
          color: #1a3a2f;
          font-size: 22px;
          margin: 0 0 16px;
        }
        .pause-text {
          color: #4b5563;
          font-size: 15px;
          line-height: 1.6;
          margin: 0 0 12px;
        }
        .pause-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin: 24px 0 16px;
        }
        .pause-btn-breathe {
          background: linear-gradient(135deg, #1a3a2f 0%, #2d5a4a 100%);
          color: white;
          border: none;
          padding: 16px 24px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .pause-btn-breathe:hover {
          transform: scale(1.02);
        }
        .pause-btn-continue {
          background: transparent;
          color: #666;
          border: 1px solid #e5e7eb;
          padding: 14px 24px;
          border-radius: 12px;
          font-size: 15px;
          cursor: pointer;
        }
        .pause-btn-continue:hover {
          background: #f9fafb;
        }
        .pause-reminder {
          color: #9ca3af;
          font-size: 13px;
          font-style: italic;
          margin: 0;
        }

        /* Unified Upload Modal */
        .upload-modal {
          background: white;
          border-radius: 24px;
          padding: 32px;
          max-width: 480px;
          width: 90%;
          position: relative;
          animation: modalSlideUp 0.3s ease;
        }
        .upload-header {
          text-align: center;
          margin-bottom: 24px;
        }
        .upload-emoji {
          font-size: 48px;
          display: block;
          margin-bottom: 12px;
        }
        .upload-header h2 {
          color: #1a3a2f;
          font-size: 24px;
          margin: 0 0 8px;
        }
        .upload-header p {
          color: #6b7280;
          font-size: 15px;
          margin: 0;
        }
        .upload-options {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .upload-option {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .upload-option:hover {
          border-color: #14b8a6;
          background: #f0fdfa;
        }
        .option-icon {
          font-size: 28px;
        }
        .option-text {
          text-align: left;
        }
        .option-title {
          font-weight: 600;
          color: #1a3a2f;
          font-size: 16px;
        }
        .option-desc {
          color: #6b7280;
          font-size: 13px;
          margin-top: 2px;
        }
        .paste-textarea {
          width: 100%;
          padding: 16px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 15px;
          font-family: inherit;
          resize: none;
          margin-bottom: 16px;
        }
        .paste-textarea:focus {
          outline: none;
          border-color: #14b8a6;
        }
        .paste-buttons {
          display: flex;
          gap: 12px;
        }
        .paste-back {
          padding: 14px 24px;
          background: transparent;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          color: #666;
          font-size: 15px;
          cursor: pointer;
        }
        .paste-submit {
          flex: 1;
          padding: 14px 24px;
          background: linear-gradient(135deg, #1a3a2f 0%, #2d5a4a 100%);
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
        }
        .paste-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .clarify-filename {
          text-align: center;
          color: #6b7280;
          font-size: 14px;
          background: #f3f4f6;
          padding: 8px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          word-break: break-all;
        }
        .clarify-options {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .clarify-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .clarify-btn:hover {
          border-color: #14b8a6;
          background: #f0fdfa;
        }
        .clarify-btn span:first-child {
          font-size: 24px;
        }

        /* Primary action highlight */
        .action-card.primary-action {
          background: linear-gradient(135deg, #f0fdfa 0%, #d1fae5 100%);
          border: 2px solid #14b8a6;
        }

        /* What's New Modal */
        .whats-new-modal {
          background: white;
          border-radius: 20px;
          padding: 32px;
          max-width: 500px;
          width: 100%;
          max-height: 80vh;
          overflow-y: auto;
          position: relative;
        }
        .whats-new-modal h2 {
          font-size: 24px;
          color: #1a3a2f;
          margin-bottom: 8px;
        }
        .whats-new-intro {
          color: #666;
          margin-bottom: 24px;
        }
        .update-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .update-item {
          background: #f9fafb;
          border-radius: 12px;
          padding: 16px;
        }
        .update-date {
          font-size: 11px;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .update-item h4 {
          font-size: 15px;
          color: #1a3a2f;
          margin: 6px 0;
        }
        .update-item p {
          font-size: 13px;
          color: #666;
          line-height: 1.5;
          margin: 0;
        }
        .whats-new-footer {
          text-align: center;
          color: #14b8a6;
          font-size: 14px;
          margin-top: 20px;
        }

        /* Pause Modal */
        .pause-modal {
          background: white;
          border-radius: 24px;
          padding: 40px 32px;
          max-width: 440px;
          width: 90%;
          text-align: center;
          animation: breatheIn 0.4s ease;
        }
        @keyframes breatheIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .pause-icon {
          font-size: 48px;
          margin-bottom: 16px;
          animation: gentlePulse 2s ease-in-out infinite;
        }
        @keyframes gentlePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .pause-modal h2 {
          font-size: 24px;
          color: #1a3a2f;
          margin-bottom: 16px;
        }
        .pause-message {
          color: #4b5563;
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 12px;
        }
        .pause-submessage {
          color: #6b7280;
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 24px;
        }
        .pause-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }
        .pause-breathe-btn {
          padding: 16px 24px;
          background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
          color: white;
          border: none;
          border-radius: 16px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .pause-breathe-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(20, 184, 166, 0.4);
        }
        .pause-continue-btn {
          padding: 14px 24px;
          background: transparent;
          color: #6b7280;
          border: 2px solid #e5e7eb;
          border-radius: 16px;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .pause-continue-btn:hover {
          border-color: #d1d5db;
          color: #4b5563;
        }
        .pause-reminder {
          font-size: 13px;
          color: #9ca3af;
          font-style: italic;
        }

        /* Feedback Modal */
        .feedback-modal {
          background: white;
          border-radius: 20px;
          padding: 32px;
          max-width: 480px;
          width: 100%;
          position: relative;
        }
        .feedback-modal h2 {
          font-size: 22px;
          color: #1a3a2f;
          margin-bottom: 8px;
        }
        .feedback-intro {
          color: #666;
          margin-bottom: 20px;
        }
        .feedback-types {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .feedback-type {
          padding: 10px 16px;
          border-radius: 20px;
          border: 2px solid #e5e7eb;
          background: white;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .feedback-type.active {
          border-color: #1a3a2f;
          background: #f0fdf4;
        }
        .feedback-modal textarea {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          border: 2px solid #e5e7eb;
          font-size: 15px;
          font-family: inherit;
          resize: vertical;
          margin-bottom: 16px;
          box-sizing: border-box;
        }
        .feedback-modal textarea:focus {
          outline: none;
          border-color: #14b8a6;
        }
        .submit-feedback-btn {
          width: 100%;
          padding: 14px;
          background: #1a3a2f;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }
        .submit-feedback-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .feedback-success {
          text-align: center;
          padding: 20px;
        }
        .success-icon {
          font-size: 56px;
          display: block;
          margin-bottom: 16px;
        }
        .feedback-success h2 {
          margin-bottom: 8px;
        }
        .feedback-success p {
          color: #666;
          margin-bottom: 24px;
        }
        .feedback-done-btn {
          background: #1a3a2f;
          color: white;
          border: none;
          padding: 12px 32px;
          border-radius: 8px;
          font-size: 15px;
          cursor: pointer;
        }

        /* Save Evidence Modal */
        .save-modal {
          background: white;
          border-radius: 16px;
          padding: 24px;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
        }
        .save-modal h3 {
          color: #1a3a2f;
          margin: 0 0 4px;
          font-size: 20px;
        }
        .modal-subtitle {
          color: #666;
          font-size: 14px;
          margin: 0 0 20px;
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 6px;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .save-modal input,
        .save-modal select,
        .save-modal textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .save-modal input:focus,
        .save-modal select:focus,
        .save-modal textarea:focus {
          outline: none;
          border-color: #14b8a6;
        }
        .quote-preview {
          background: #f9fafb;
          border-left: 3px solid #14b8a6;
          padding: 12px;
          border-radius: 0 8px 8px 0;
          font-style: italic;
          color: #4b5563;
          font-size: 14px;
          max-height: 100px;
          overflow-y: auto;
        }
        .patterns-preview {
          margin-bottom: 20px;
        }
        .patterns-preview label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }
        .pattern-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .pattern-tag {
          background: #e0e7ff;
          color: #4f46e5;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }
        .modal-actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }
        .cancel-btn {
          flex: 1;
          padding: 12px;
          background: #f3f4f6;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }
        .save-btn {
          flex: 2;
          padding: 12px;
          background: #1a3a2f;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .action-btn.details {
          background: #f0fdf4;
          color: #166534;
        }

        @media (max-width: 640px) {
          .actions-grid {
            grid-template-columns: 1fr;
          }
          .tagline {
            flex-direction: column;
            align-items: center;
          }
          .header-right {
            gap: 8px;
          }
          .court-badge, .evidence-badge {
            padding: 4px 8px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}