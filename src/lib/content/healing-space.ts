/**
 * Pattern18 Healing Space System
 * 
 * Support for parents in high-conflict coparenting:
 * - Parenting a child who mirrors the other parent's behavior
 * - Managing your own triggers
 * - Scripts for hard conversations
 * - Grounding when you're spiraling
 * - Truth anchors when you're being gaslit
 * 
 * Written to be universal - works for any gender, any child age, any situation.
 */

/**
 * PARENTING THROUGH TRAUMA
 * When the child mirrors the other parent's behavior
 * 
 * Note: Use [child] as placeholder, replaced with actual name in app.
 * All pronouns kept neutral or contextual.
 */
export const PARENTING_SUPPORT = {
  
    // Core truths for when it's hardest
    coreTruths: {
      trigger: {
        short: "My trigger is not the problem. The abuse was.",
        full: "I am allowed to have reactions to cruelty. My nervous system learned to protect me. I won't shame myself for survival responses."
      },
      boundaries: {
        short: "My boundaries are not betrayal.",
        full: "Setting boundaries doesn't make me the problem. I'm breaking the cycle. This is love in its most courageous form."
      },
      child: {
        short: "They're allowed to love their other parent. That doesn't mean I have to pretend I was treated well.",
        full: "My child can hold two truths: love for both parents, and eventually, understanding of what happened. I don't have to resolve that for them."
      },
      safe: {
        short: "I am the safe parent. I am the steady ground.",
        full: "Even if they can't see it now, one day they may look back and realize who protected their heart — not by fighting, but by refusing to become what hurt me."
      }
    },
  
    // Scripts for when the child is being difficult
    // These are TEMPLATES - the app should adapt based on child's age and situation
    whenChildIsDifficult: [
      {
        situation: "When they repeat something hurtful they heard",
        script: "That's an interesting thing to say. Where did that come from?",
        why: "Gently invites reflection without shaming or overexplaining."
      },
      {
        situation: "When they're critical of you",
        script: "I hear that you're upset. I'm here when you want to talk about what's really going on.",
        why: "Stays open without being defensive or reactive."
      },
      {
        situation: "When you want to share your truth",
        script: "I know you see and hear things that are confusing. I've experienced those patterns too, and it took me a long time to understand them. If you ever want to talk about what's healthy or not, I'm here.",
        why: "Opens the door without slamming the other parent."
      },
      {
        situation: "When they apologize or soften",
        script: "Thank you. That matters to me. You're learning how to work through hard feelings, and that takes courage.",
        why: "Reinforces emotional growth, not just compliance."
      }
    ],
  
    // Responding to specific deflections
    deflectionResponses: {
      "mocking your calm": {
        context: "They mock you for speaking calmly or setting boundaries",
        options: [
          "I don't perform. I speak the truth once, and I walk away when I'm not being respected.",
          "You're welcome to disagree with how I communicate. I'm still going to do it this way."
        ],
        why: "Avoids the trap, maintains dignity."
      },
      "you're dramatic": {
        context: "They say you're dramatic, overreacting, too sensitive",
        options: [
          "Being able to feel things deeply isn't a flaw. It's how I've survived and healed.",
          "You can think I'm dramatic. I know what I experienced."
        ],
        why: "Names the tactic without engaging in JADE (Justify, Argue, Defend, Explain)."
      },
      "defends other parent": {
        context: "They defend the other parent's behavior",
        options: [
          "You're allowed to love them. That doesn't mean I have to pretend I was treated well.",
          "I understand you see things differently. My experience was real too."
        ],
        why: "Holds truth while allowing them to have their own relationship."
      },
      "dismissive body language": {
        context: "Eye rolls, sighs, turning away",
        options: [
          "I see that. I'm still going to say what I need to say.",
          "I'm here when you're ready to hear me."
        ],
        why: "Doesn't chase connection, holds ground."
      },
      "questions your sources": {
        context: "They question where you got your words or ideas",
        options: [
          "Does it matter where the words came from if they're true?",
          "I've learned a lot about healthy communication. This is me practicing it."
        ],
        why: "Redirects to substance, not source."
      },
      "acts superior": {
        context: "Condescending or superior attitude",
        options: [
          "You don't have to agree with me. But I do expect basic respect.",
          "I'm not going to engage when I'm being talked down to."
        ],
        why: "Sets clear boundary without escalating."
      }
    },
  
    // After time with other parent
    afterOtherParentTime: {
      expect: [
        "Emotional dysregulation (anger, withdrawal, testing)",
        "Repeating phrases or attitudes from the other home",
        "Testing your boundaries to see if you're 'safe'",
        "Needing space before reconnecting",
        "Possible regression in behavior"
      ],
      approach: [
        "Give them space to decompress (don't interrogate)",
        "Keep your home calm and predictable",
        "Don't take the bait if they're testing you",
        "Neutral greeting: 'Hey, good to see you'",
        "Let them come to you when ready"
      ],
      remember: "This is a transition. Their behavior right now doesn't define your relationship. Stay steady."
    }
  };
  
  /**
   * GROUNDING TOOLS
   * For when you're triggered, spiraling, or preparing for something hard
   */
  export const GROUNDING_TOOLS = {
    
    breathing: {
      name: "4-7-8 Breath",
      when: "Quick regulation when triggered",
      steps: [
        "Breathe in through your nose for 4 counts",
        "Hold for 7 counts",
        "Exhale slowly through your mouth for 8 counts",
        "Repeat 3-4 times"
      ],
      why: "Activates parasympathetic nervous system, breaks the stress response."
    },
  
    grounding: {
      name: "5-4-3-2-1 Grounding",
      when: "When you're spiraling or dissociating",
      steps: [
        "5 things you can SEE",
        "4 things you can TOUCH",
        "3 things you can HEAR",
        "2 things you can SMELL",
        "1 thing you can TASTE"
      ],
      why: "Brings you back to the present moment, out of the trauma loop."
    },
  
    physical: {
      name: "Cold Water Reset",
      when: "When emotions are overwhelming",
      steps: [
        "Run cold water over your wrists",
        "Or hold ice cubes in your hands",
        "Or splash cold water on your face",
        "Focus on the physical sensation"
      ],
      why: "Interrupts the emotional flooding with physical sensation."
    },
  
    preparation: {
      name: "Before Hard Conversations",
      when: "Preparing for exchanges, court, or difficult interactions",
      steps: [
        "Name what you're afraid of (write it down)",
        "Remind yourself: 'I've survived worse'",
        "Decide your ONE boundary for this interaction",
        "Have an exit plan or time limit",
        "Plan something gentle for yourself afterward"
      ],
      why: "Reduces anxiety by creating structure and safety."
    },
  
    recovery: {
      name: "After Being Triggered",
      when: "After a hard interaction",
      steps: [
        "Remove yourself from the situation if possible",
        "Name it: 'I'm triggered right now'",
        "Do 4-7-8 breathing",
        "Remind yourself: 'This feeling will pass'",
        "Wait before responding to anything"
      ],
      why: "Prevents reactive responses that could be used against you."
    }
  };
  
  /**
   * TRUTH ANCHORS
   * Mantras and reminders when you're being gaslit
   */
  export const TRUTH_ANCHORS = {
    
    identity: [
      "I am not dramatic — I am healing.",
      "I am not difficult — I have boundaries.",
      "I am not crazy — I see clearly now.",
      "I am not the problem — I'm breaking the cycle."
    ],
  
    reality: [
      "This is abuse. I am not imagining it.",
      "My memory is accurate. My experience was real.",
      "I don't need them to admit it for it to be true.",
      "Other people's denial doesn't change what happened."
    ],
  
    boundaries: [
      "I will not be gaslit into silence.",
      "I will not JADE (Justify, Argue, Defend, Explain).",
      "I will not set myself on fire to keep someone else warm.",
      "No response is a response. Silence is allowed."
    ],
  
    future: [
      "My child is watching how I handle this.",
      "I am modeling what healthy boundaries look like.",
      "This situation is temporary. My healing is permanent.",
      "I am building a record. Every incident documented is progress."
    ]
  };
  
  /**
   * REPAIR SCRIPTS
   * For after you've been triggered in front of your child
   */
  export const REPAIR_SCRIPTS = {
    
    full: `Hey. Last night, I got triggered. I've been through a lot, and sometimes I don't handle it perfectly. I'm sorry if it felt heavy.
  
  I want you to know that my reaction wasn't about you. You're not responsible for my feelings. I'm working on healing, and sometimes that's messy.
  
  What I want you to learn from me isn't perfection — it's how to own your mistakes and keep showing up. I love you, and I'm here.`,
  
    short: `I got triggered last night. That wasn't about you. I'm sorry if it was hard to be around. I love you and I'm working on it.`,
  
    lightest: `Hey, I know I was off last night. I'm okay. I love you.`
  };
  
  /**
   * RESPONDING TO CO-PARENT
   * General principles for gray rock communication
   */
  export const COPARENT_COMMUNICATION = {
    
    principles: [
      "BIFF: Brief, Informative, Friendly, Firm",
      "Respond to what requires response, ignore the bait",
      "State facts, not feelings",
      "One topic per message when possible",
      "Document everything"
    ],
  
    formula: {
      acknowledge: "Acknowledge the logistical request (if any)",
      answer: "Provide necessary information only",
      boundary: "Set boundary if needed, without explanation",
      close: "End without invitation for debate"
    },
  
    examples: [
      {
        bait: "Long accusatory message about your parenting",
        response: "[Address only the logistics, ignore accusations]"
      },
      {
        bait: "Demands immediate response",
        response: "I'll respond to scheduling requests within 24 hours as our order specifies."
      },
      {
        bait: "Tries to change agreed plans last minute",
        response: "We'll stick with the schedule as agreed."
      }
    ],
  
    remember: "Every response you send could be read aloud in court. Write accordingly."
  };
  
  /**
   * SYSTEM PROMPT FOR HEALING SPACE
   */
  export const HEALING_SPACE_SYSTEM_PROMPT = `You are Pattern18's Healing Space — a trauma-informed support system for parents in high-conflict custody situations.
  
  ## YOUR ROLE
  
  You are not a therapist. You are a knowledgeable, warm companion who:
  - Validates their experience without dramatizing
  - Provides practical scripts and strategies
  - Helps them regulate their nervous system
  - Reminds them of truth when they're being gaslit
  - Supports them in parenting through trauma
  
  ## TONE
  
  - Warm but grounded
  - Direct but compassionate
  - Knowledgeable without lecturing
  - Present without being overwhelming
  
  ## WHAT YOU HELP WITH
  
  1. **Regulation** - Breathing, grounding, managing triggers
  2. **Parenting** - Scripts for hard conversations with children
  3. **Truth** - Anchoring them in reality when they're being gaslit
  4. **Repair** - How to reconnect after being triggered
  5. **Communication** - Gray rock responses to co-parent
  
  ## WHAT YOU DON'T DO
  
  - Provide therapy or medical advice
  - Tell them what to do legally
  - Badmouth the other parent (even if they do)
  - Push them to do anything they're not ready for
  - Minimize their experience
  
  ## REMEMBER
  
  They're often coming to you dysregulated. Meet them where they are. Help them feel safe first, then offer tools.
  
  Their child's behavior may mirror the other parent's. This is painful. Help them see it as a symptom, not a rejection.
  
  The goal isn't to "win" — it's to stay regulated, document everything, and break the cycle.`;