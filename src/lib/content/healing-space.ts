/**
 * Pattern 18 Healing Space System
 * 
 * This isn't just breathing exercises - it's the deeper support:
 * - Parenting a child who mirrors the abuser
 * - Managing your own triggers
 * - Scripts for hard conversations
 * - Grounding when you're spiraling
 * - Truth anchors when you're being gaslit
 * 
 * Based on what Christy actually needed from ChatGPT.
 */

/**
 * PARENTING THROUGH TRAUMA
 * When the child mirrors the abuser's behavior
 */
export const PARENTING_SUPPORT = {
  
    // Core truths for when it's hardest
    coreTruths: {
      whenTriggered: {
        short: "My trigger is not the problem. His father's abuse was.",
        full: "I am not dramatic — I am healing. I do not owe anyone silence. My peace is sacred, and I protect it with love and strength, even when it hurts."
      },
      whenMocked: {
        short: "Mocking me doesn't make your behavior okay.",
        full: "I've survived cruelty disguised as love. I know the difference now. I will not be shamed into silence, and I will not be pulled into patterns that broke me."
      },
      whenGuilted: {
        short: "My boundaries are not betrayal.",
        full: "My boundaries are not betrayal. I am not the problem. I'm breaking the cycle so my son doesn't become it. This is love in its most courageous form."
      },
      whenDefended: {
        short: "You're allowed to love your dad. That doesn't mean I have to pretend he treated me well.",
        full: "I know you see one version of him. I lived another. Both can be true, even if they don't match."
      },
      whenHopeless: {
        short: "You are the safe parent. You are the true mirror.",
        full: "Even if he can't see it now, one day he will look back and realize who protected his heart — not by fighting the father, but by refusing to become him."
      }
    },
  
    // Scripts for when the child is mean/critical
    whenChildIsMean: [
      {
        situation: "When he's critical or mocking you",
        script: "I know you learned that tone somewhere, but it doesn't work here. I won't be spoken to like that. If you're upset, use your real feelings — not someone else's voice.",
        why: "Gently names the influence without shaming or overexplaining."
      },
      {
        situation: "When he's cruel on purpose",
        script: "That was unkind, and I don't allow people to treat me that way — including you. I'm going to walk away now, and I'll be here when you're ready to try again with kindness.",
        why: "Models boundaries and repair."
      },
      {
        situation: "When you feel triggered",
        script: "That hit a nerve for me. I'm going to take a minute so I can respond instead of react. I love you too much to let us spiral.",
        why: "Models emotional responsibility and lets him see you're human without dumping on him."
      },
      {
        situation: "When you want to tell the truth about his dad",
        script: "I know you see and hear things at your dad's that are confusing. I've lived with those patterns too, and it took me a long time to understand them. If you ever want to talk about what's healthy or not, I'll tell you the truth — with love, not judgment.",
        why: "Opens the door without slamming the other parent."
      },
      {
        situation: "When he apologizes or softens",
        script: "Thank you. That matters to me. You're learning how to work through hard feelings, and that takes courage. Let's keep practicing together.",
        why: "Reinforces his emotional maturity, not just compliance."
      }
    ],
  
    // When child says specific hurtful things
    specificResponses: {
      "get it all out": {
        context: "He says this mockingly when you try to speak calmly",
        responses: [
          "I don't perform for people. I speak the truth once, and I walk away when I'm not being respected.",
          "I don't argue with disrespect. I step away from it."
        ],
        why: "Avoids the trap completely, puts you back in control."
      },
      "you're ridiculous": {
        context: "He dismisses your concerns as drama",
        responses: [
          "I've been through more than you know. Speaking up about what's not okay isn't drama. It's called healing. And I won't let that be mocked in my own home.",
          "Calling someone dramatic is a tactic people use to silence truth. I know that trick. It doesn't work here."
        ],
        why: "Names the tactic without engaging in JADE."
      },
      "you're over sensitive": {
        context: "He minimizes your feelings",
        responses: [
          "I'm sensitive because I feel. Because I care. That's not weakness — that's what makes me human.",
          "Being able to feel things deeply isn't a flaw. It's how I've survived, healed, and stayed connected to what matters."
        ],
        why: "Reframes sensitivity as strength."
      },
      "defends his dad": {
        context: "He defends his father's behavior",
        responses: [
          "You're allowed to love your dad. That doesn't mean I have to pretend he treated me well. I won't lie to protect someone who hurt me.",
          "I know you see one version of him. I lived another. Both can be true, even if they don't match."
        ],
        why: "Holds truth while allowing him to have his own relationship."
      },
      "rolls his eyes": {
        context: "He rolls his eyes at your words",
        responses: [
          "You can roll your eyes — I still meant every word.",
          "That eye roll doesn't change the truth. I love you, and I'm showing up anyway.",
          "Good to know your eyes still work. Just making sure you heard me."
        ],
        why: "Doesn't chase the connection, holds ground."
      },
      "did you use ChatGPT": {
        context: "He mocks you for using tools to help you communicate",
        responses: [
          "Does it matter where the words came from if they're true?",
          "You can criticize the tool — but what I said still stands. Are you upset because it's not true… or because it is?",
          "I use resources that help me grow. You're allowed to do the same. Doesn't change what I see and feel."
        ],
        why: "If the only way he can avoid your words is by mocking how you found them, that tells you a lot."
      },
      "acts arrogant": {
        context: "He responds with smugness or intellectual superiority",
        responses: [
          "It's easier to be smug than real. I get it. I've seen it before. But I hope someday you'll choose depth over distance.",
          "That response proves my point. But I'm not here to fight — I'm here to love you enough to tell the truth.",
          "Okay. I said what I needed to say. Whether or not it sinks in is up to you."
        ],
        why: "Doesn't engage the performance, ends with calm."
      }
    },
  
    // When child comes back from other parent's house
    afterDadsHouse: {
      whatToExpect: "He may come back colder, meaner, more aligned with dad. This is conditioning, not choice. His survival brain tells him it's safer to align with the dominant parent.",
      dayOneScript: {
        greeting: "Hey. Welcome back.",
        note: "Neutral. Warm. No expectations. Don't chase connection."
      },
      waitPeriod: "Give his nervous system 24-48 hours to detox from the other parent's influence before any deep talks.",
      ifCold: {
        script: "It's hard when you come back and I feel like I'm the enemy. I love you — and I'm still me.",
        why: "You don't beg. You just hold your place."
      }
    }
  };
  
  
  /**
   * NERVOUS SYSTEM SUPPORT
   * Grounding tools for when you're triggered
   */
  export const GROUNDING_TOOLS = {
    
    // Quick regulation
    quickBreathing: {
      name: "4-7-8 Breath",
      steps: [
        "Breathe in through your nose for 4 counts",
        "Hold for 7 counts",
        "Exhale slowly through your mouth for 8 counts",
        "Repeat 3-4 times"
      ],
      when: "When you feel your heart racing or chest tightening"
    },
  
    // Body-based grounding
    fiveThings: {
      name: "5-4-3-2-1 Grounding",
      steps: [
        "Name 5 things you can SEE",
        "Name 4 things you can TOUCH",
        "Name 3 things you can HEAR",
        "Name 2 things you can SMELL",
        "Name 1 thing you can TASTE"
      ],
      when: "When you're spiraling or dissociating"
    },
  
    // Physical reset
    coldWater: {
      name: "Cold Water Reset",
      steps: [
        "Run cold water over your wrists for 30 seconds",
        "Or splash cold water on your face",
        "This activates the dive reflex and calms the nervous system"
      ],
      when: "When you need to physically interrupt a panic response"
    },
  
    // Before hard conversations
    preConversation: {
      name: "Before Hard Conversations",
      steps: [
        "Take 3 slow breaths",
        "Feel your feet on the ground",
        "Remind yourself: 'I do not have to convince him. I just have to stay rooted in truth.'",
        "Picture yourself calm after the conversation is over",
        "You are ready"
      ],
      when: "Before talking to your child about hard things, before court, before any high-stakes moment"
    },
  
    // After being triggered
    afterTrigger: {
      name: "Post-Trigger Recovery",
      steps: [
        "Remove yourself from the situation if possible",
        "Put your hand on your heart",
        "Say out loud: 'I am safe. This feeling will pass.'",
        "Shake out your hands and arms (literally shake them)",
        "Take 5 slow breaths",
        "Remind yourself what just happened was a trigger, not a truth"
      ],
      when: "After your child says something that echoes the abuser, after a hard message, after court"
    }
  };
  
  
  /**
   * TRUTH ANCHORS
   * Mantras for when you're being gaslit or doubting yourself
   */
  export const TRUTH_ANCHORS = {
    
    // Core identity
    iAm: [
      "I am not dramatic — I am healing.",
      "I am not too sensitive — I am aware.",
      "I am not the problem — I am the solution.",
      "I am not crazy — I am reacting to crazy-making behavior.",
      "I am not alone — I am building my case."
    ],
  
    // About the situation
    thisIs: [
      "This is abuse. I am not imagining it.",
      "This is a pattern. It has happened before and been documented.",
      "This is not about me. It's about his need for control.",
      "This is temporary. I am building toward freedom.",
      "This is evidence. Every incident strengthens my case."
    ],
  
    // About the future
    iWill: [
      "I will not be gaslit into silence.",
      "I will not beg for basic respect.",
      "I will not sacrifice my peace for his comfort.",
      "I will not let my son become what hurt me.",
      "I will document, prepare, and protect."
    ],
  
    // When you doubt yourself
    remember: [
      "You survived. You are still surviving. You will survive this too.",
      "Your memory is accurate. Your feelings are valid. Your boundaries are necessary.",
      "You are not making it up. The texts exist. The patterns are documented.",
      "You have already changed the story. You're living proof of it.",
      "One day, your son will understand. And even if he doesn't, you did everything right."
    ]
  };
  
  
  /**
   * CAR RIDE TALKS
   * Scripts for hard conversations with children
   */
  export const CAR_RIDE_SCRIPTS = {
  
    // After a conflict with child
    repairScript: {
      full: `"Hey bud. Before you go, I just want to say something.
  
  Last night, I got triggered. I've been through a lot, and sometimes when I hear a certain tone or see someone I love acting in ways I've worked hard to heal from, it hits deep. I didn't handle it perfectly, and I'm sorry if it felt heavy.
  
  But I want to be honest with you — how we treat people matters. Not just in public. Not just when it makes us look good. But especially with the people closest to us, at home, when no one's watching. That's where real character lives.
  
  I believe in you. Even when we argue. Even when I get hurt. I love you, and I'll be here when you get back."`,
      
      short: "I know last night got tense — I just want you to know I love you, I'm still learning too, and I'll be here when you get back.",
      
      lightest: "Look, I'm still your mom whether you like it or not. I love you. I screw up sometimes. You do too. We'll figure it out. See you in five."
    },
  
    // Telling truth about patterns
    namingPatterns: {
      gentle: "I see you sometimes act in ways your dad does. I've worked hard to understand those patterns because they caused a lot of pain. I don't want you to carry that pain forward.",
      
      direct: "When I hear that tone — that sarcasm, that dismissiveness — it hits me in a place that's still healing. It reminds me of someone who treated me badly for a long time. And I know you're not him. I know you can choose something different.",
      
      withHope: "You're becoming your own person, and I want you to have real power — not power that comes from tearing people down. You're better than that. And I know part of you knows it too."
    },
  
    // About healthy vs unhealthy
    whatLoveLooksLike: {
      notThis: "Love doesn't feel like walking on eggshells. It doesn't feel like being afraid to mess up.",
      
      thisIs: "Real love makes people feel safe, not small. Real strength makes people feel supported, not controlled.",
      
      boundary: "When someone controls others through fear, silence, or criticism — that's not leadership. That's harm."
    }
  };
  
  
  /**
   * System prompt for Healing Space conversations
   */
  export const HEALING_SPACE_SYSTEM_PROMPT = `You are the Healing Space within Pattern 18 — a warm, knowledgeable, trauma-informed support for parents navigating high-conflict custody situations.
  
  ## YOUR ROLE
  
  You provide:
  - Nervous system support (grounding, breathing, regulation)
  - Parenting scripts for hard conversations with children
  - Truth anchors when they're being gaslit
  - Validation and compassion for their experience
  - Psychoeducation about coercive control and its effects on children
  
  ## HOW YOU RESPOND
  
  ### 1. MEET THEM WHERE THEY ARE
  If they're in crisis, don't educate — ground first.
  If they're grieving, don't fix — hold space first.
  If they're triggered, help regulate — then strategize.
  
  ### 2. GIVE SPECIFIC SCRIPTS
  Don't say "set a boundary." Give them exact words:
  - "That was unkind. I don't allow people to treat me that way — including you."
  
  ### 3. EXPLAIN THE WHY
  Help them understand what's happening:
  - "He's not choosing this. He's been conditioned. His survival brain tells him it's safer to align with his dad."
  
  ### 4. ANTICIPATE SCENARIOS
  Think ahead: "What if he rolls his eyes?" Have responses ready.
  
  ### 5. SUPPORT THEIR NERVOUS SYSTEM
  Offer grounding tools, breathing exercises, mantras — concrete things they can use.
  
  ### 6. HOLD HOPE
  The story isn't finished. The child is still developing. The safe parent's steadiness matters.
  
  ## KEY UNDERSTANDINGS
  
  ### About Children of Coercive Control
  - They align with the dominant parent for survival
  - They may parrot the abuser's words and tone
  - They're not broken — they're conditioned
  - Your steadiness is the counterweight to the chaos
  - It may take years, but they remember who was safe
  
  ### About Triggers
  - Triggers are not weaknesses — they're alarm systems from trauma
  - When your child sounds like your abuser, your body responds to the PATTERN, not just the words
  - You can be triggered AND regulated
  - Naming the trigger helps discharge it
  
  ### About Boundaries with Children
  - Boundaries are not punishment — they're protection
  - You can love your child AND refuse to be mistreated
  - Walking away is not abandonment — it's modeling self-respect
  - Calm with boundaries is what stops the cycle
  
  ## YOUR TONE
  
  - Warm and grounded
  - Understanding but not enabling
  - Hopeful but honest
  - Like a wise friend who's been through this
  
  ## REMEMBER
  
  This parent is doing sacred work. They're trying to break a generational cycle while standing in the middle of it. Honor that courage.`;