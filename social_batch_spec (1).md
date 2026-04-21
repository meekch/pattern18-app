# Social Batch Spec — Apr 21 to May 4, 2026

This file is the source of truth for a batch upload + schedule run via Blotato MCP.

Total posts: **22** (14 Pattern18 + 8 Opalite)
Image folder: `./social_batch/` (22 JPGs, 1080x1080)
Timezone for all scheduled times: **MST (America/Phoenix, UTC-7, no DST)**

---

## Blotato Account IDs (verified from blotato_list_accounts)

### Pattern18 accounts
| Platform | accountId | Username/Page |
|---|---|---|
| Instagram | `36881` | @pattern18app |
| TikTok | `34690` | @pattern18app |
| Facebook | `23443` (parent), pageId `983907948130570` | Pattern 18 page |

### Opalite accounts
| Platform | accountId | Username/Page |
|---|---|---|
| Instagram | `35902` | @opalitesystems |
| TikTok | `34018` | @opalite.systems |
| LinkedIn | `15386` (parent), pageId `112223779` | Opalite Systems company page |
| Facebook | `23443` (parent), pageId `1046147251915524` | Opalite Systems page |

---

## TikTok required fields (use for ALL TikTok posts)

```json
{
  "privacyLevel": "PUBLIC_TO_EVERYONE",
  "disabledComments": false,
  "disabledDuet": false,
  "disabledStitch": false,
  "isBrandedContent": false,
  "isYourBrand": true,
  "isAiGenerated": false,
  "autoAddMusic": true
}
```

---

## CRITICAL RULES (do not violate)

1. **Image upload first.** For each image: call `blotato_create_presigned_upload_url` with the filename, PUT the local file to the presignedUrl with header `Content-Type: image/jpeg`, then use the returned `publicUrl` as the `mediaUrls` value for the post.
2. **Image upload only works from unrestricted networks** (Cursor / Claude Code). Do NOT attempt this from Claude.ai bash — it will 403.
3. **Pattern18 posts** go to: Instagram, TikTok, Facebook (3 platforms each).
4. **Opalite posts** go to: Instagram, TikTok, LinkedIn, Facebook (4 platforms each).
5. **First comments must be added MANUALLY in Blotato UI** before scheduled time fires (MCP doesn't support first comments). Only Opalite posts 2, 6, 8 need first comments — see "First comments needed" section below.
6. **All scheduled times are MST** — convert to ISO 8601 UTC for Blotato (add 7 hours: 9:00 AM MST = 16:00:00 UTC).
7. **Hashtags go at the END of the caption text**, separated from the caption body by two blank lines.
8. **Do NOT modify caption text** — copy verbatim from this spec. The Hormozi/brand voice rules have already been applied.

---

## First comments needed (manual step in Blotato UI)

After scheduling, add `opalitesystems.com/intake` as the first comment on these posts (Instagram + Facebook only — TikTok and LinkedIn excluded per brand rule):

- Opalite Post 2 (Apr 22) — IG + FB
- Opalite Post 6 (Apr 29) — IG + FB
- Opalite Post 8 (May 2) — IG + FB

---

## PATTERN18 BATCH (14 posts)

### Pattern18 platform schedule template
For each P18 post, schedule on all 3 platforms at these times (MST):
- **Instagram**: 8:00 PM MST → ISO `T03:00:00Z` next day
- **TikTok**: 8:00 PM MST → ISO `T03:00:00Z` next day
- **Facebook**: 8:00 PM MST → ISO `T03:00:00Z` next day

(All Pattern18 posts share the same time across platforms — 8pm MST is when separated parents are on their phones.)

---

### P18-01 — Tue Apr 21 — DARVO
**Image**: `p18_01_DARVO.jpg`
**Scheduled**: 2026-04-22T03:00:00Z (8:00 PM MST Apr 21)

**Caption:**
```
DARVO stands for Deny, Attack, Reverse Victim and Offender. It is what happens when you bring up something that hurt you and somehow end up apologizing to them. First they deny it happened. Then they attack you for bringing it up. Then they flip the script so they are the wounded party. If you have ever walked away from a conversation wondering how it became your fault, you have seen DARVO in action. Pattern18 helps you spot it the moment it shows up in their text. Try it free for 7 days.


#DARVO #CoParenting #HighConflictDivorce #NarcissisticAbuse #Pattern18
```

---

### P18-02 — Wed Apr 22 — Gaslighting
**Image**: `p18_02_Gaslighting.jpg`
**Scheduled**: 2026-04-23T03:00:00Z (8:00 PM MST Apr 22)

**Caption:**
```
The word gets used a lot now, often for any conflict where two people remember things differently. Real gaslighting is something more specific. It is the deliberate effort to make you doubt your own memory. Sentences like "that never happened," "you are imagining things," or "you are too sensitive" said over and over until you stop trusting yourself. In high-conflict custody, this often shows up around exchanges, agreements, and what was said in front of the kids. Writing things down is not paranoid. It is how you keep your footing. We talk about this often in the free Pattern18 community.


#Gaslighting #CoParenting #DivorceSupport #CustodyBattle #Pattern18
```

---

### P18-03 — Thu Apr 23 — Narcissist
**Image**: `p18_03_Narcissist.jpg`
**Scheduled**: 2026-04-24T03:00:00Z (8:00 PM MST Apr 23)

**Caption:**
```
Real narcissism is not someone who took the last cookie or posted too many selfies. It is a consistent pattern of needing admiration, lacking empathy, and treating other people as objects to be used. Most actual narcissists never get diagnosed because they do not believe anything is wrong with them. You do not need a diagnosis to recognize the pattern. You just need to know what you are looking at. The free Pattern18 community is a place to compare notes with other parents who have lived it, without anyone telling you to "just communicate better." Join us at skool.com/comp-4007.


#Narcissist #NarcissisticAbuse #CoParenting #HighConflictDivorce #Pattern18
```

---

### P18-04 — Fri Apr 24 — Coercive control
**Image**: `p18_04_CoerciveControl.jpg`
**Scheduled**: 2026-04-25T03:00:00Z (8:00 PM MST Apr 24)

**Caption:**
```
Coercive control is a pattern of behavior used to dominate and isolate another person. It includes monitoring, financial control, isolating you from friends and family, undermining your parenting, and weaponizing the legal system. It is now recognized in family law in California, Hawaii, Connecticut, Colorado, and Washington. If your state is not on that list yet, your documentation still matters. Patterns of behavior over time are what attorneys and judges respond to. Single incidents are often dismissed. The pattern is the case.


#CoerciveControl #DomesticAbuse #FamilyLaw #CoParenting #Pattern18
```

---

### P18-05 — Sat Apr 25 — Parental alienation
**Image**: `p18_05_ParentalAlienation.jpg`
**Scheduled**: 2026-04-26T03:00:00Z (8:00 PM MST Apr 25)

**Caption:**
```
Parental alienation describes a parent actively turning a child against the other parent through manipulation, false claims, or systematic undermining. It is real and it does serious harm. It is also one of the most weaponized terms in family court, often used by the alienating parent to accuse the protective parent of doing exactly what they themselves are doing. The way through is documentation that shows the actual pattern over time. Pattern18 builds that timeline for you as you go. Try it free for 7 days.


#ParentalAlienation #FamilyCourt #CustodyBattle #CoParenting #Pattern18
```

---

### P18-06 — Sun Apr 26 — Love bombing
**Image**: `p18_06_LoveBombing.jpg`
**Scheduled**: 2026-04-27T03:00:00Z (8:00 PM MST Apr 26)

**Caption:**
```
Love bombing is intense, over-the-top affection used to gain control of someone, usually at the start of a relationship or during a "good phase" after a bad one. In post-separation co-parenting, it often shows up after a court date the other parent lost, or after they are caught doing something. Suddenly they want to be friends. Suddenly they remember the kids' birthdays. Suddenly they are the perfect co-parent. The pattern usually breaks within weeks. Pay attention to what comes after the love bomb. That is the real person.


#LoveBombing #ToxicRelationships #CoParenting #NarcissisticAbuse #Pattern18
```

---

### P18-07 — Mon Apr 27 — Trauma bonding
**Image**: `p18_07_TraumaBonding.jpg`
**Scheduled**: 2026-04-28T03:00:00Z (8:00 PM MST Apr 27)

**Caption:**
```
A trauma bond is the chemical and emotional attachment that forms between a person and someone who hurts them, intensified by cycles of cruelty followed by kindness. It is why intelligent, capable people stay in relationships that are clearly harming them. It is also why leaving does not always feel like relief. The bond does not break the day you sign the divorce papers. It often takes years to fully untangle. You are not weak. You were biologically wired to attach during the kindness phase. The free Pattern18 community is full of people who understand this from the inside. Join at skool.com/comp-4007.


#TraumaBonding #NarcissisticAbuse #DivorceRecovery #HealingJourney #Pattern18
```

---

### P18-08 — Tue Apr 28 — Flying monkeys
**Image**: `p18_08_FlyingMonkeys.jpg`
**Scheduled**: 2026-04-29T03:00:00Z (8:00 PM MST Apr 28)

**Caption:**
```
Flying monkeys are the people a high-conflict ex enlists to do the work for them. The mutual friend who suddenly takes a side. The family member who calls to tell you to be reasonable. The new partner who shows up at exchanges. They may not even realize they are being used. Most are sincere people responding to a one-sided story. The strategy is not to fight them or convince them. The strategy is to stay calm, document the pattern, and let time do its work. People often see the truth eventually. The Pattern18 community is a place to compare notes when this happens, because it always does.


#FlyingMonkeys #NarcissisticAbuse #CoParenting #HighConflictDivorce #Pattern18
```

---

### P18-09 — Wed Apr 29 — High-conflict
**Image**: `p18_09_HighConflict.jpg`
**Scheduled**: 2026-04-30T03:00:00Z (8:00 PM MST Apr 29)

**Caption:**
```
A high-conflict personality is someone whose core operating system runs on conflict. They do not fight to resolve a problem. They fight because the fight itself is the goal. This is different from someone who is going through a hard time, or someone who handles stress badly. It is a stable pattern that shows up across every relationship and every situation. If you have tried being kinder, more patient, more accommodating, more clear, and nothing changes, you are not the variable. The pattern is. Pattern18 helps you communicate with someone whose goal is the fight. Try it free for 7 days.


#HighConflictDivorce #CoParenting #DifficultEx #FamilyLaw #Pattern18
```

---

### P18-10 — Thu Apr 30 — Hoovering
**Image**: `p18_10_Hoovering.jpg`
**Scheduled**: 2026-05-01T03:00:00Z (8:00 PM MST Apr 30)

**Caption:**
```
Hoovering is the attempt to pull you back into contact, drama, or relationship after you have started to disengage. It often comes right when you are finally feeling stable. A sudden apology that does not really apologize. A crisis only you can solve. A casual text about something the kids did that pulls you into a longer conversation. The timing is rarely accidental. They sense distance and they reach for what worked before. You do not have to take the bait. Brief, neutral, child-focused replies break the pattern over time.


#Hoovering #NarcissisticAbuse #NoContact #CoParenting #Pattern18
```

---

### P18-11 — Fri May 1 — Triangulation
**Image**: `p18_11_Triangulation.jpg`
**Scheduled**: 2026-05-02T03:00:00Z (8:00 PM MST May 1)

**Caption:**
```
Triangulation is the use of a third person to communicate, control, or manipulate a relationship between two people. In co-parenting it often looks like one parent sending messages through the kids. "Tell your dad that..." or "Ask your mom why she..." It puts the child in the middle of adult conflict and damages their relationship with both parents over time. The fix is to take the kids out of the loop. Communicate parent-to-parent in writing, even when it feels harder. The kids feel the relief almost immediately. The free Pattern18 community talks about this constantly. Join at skool.com/comp-4007.


#Triangulation #CoParenting #KidsFirst #HighConflictDivorce #Pattern18
```

---

### P18-12 — Sat May 2 — JADE
**Image**: `p18_12_JADE.jpg`
**Scheduled**: 2026-05-03T03:00:00Z (8:00 PM MST May 2)

**Caption:**
```
JADE is one of the most useful tools you will ever learn for high-conflict communication. It stands for: Justify, Argue, Defend, Explain. The rule is to stop doing all four. When you justify, you invite a counter-argument. When you argue, you give them what they want. When you defend, you signal that their accusation has weight. When you explain, you teach them how to push your buttons better next time. The shorter and more boring your response, the faster the pattern dies. Pattern18 helps you write replies that pass the JADE test every time. We practice this together in the community.


#JADE #BoundarySetting #CoParenting #HighConflictDivorce #Pattern18
```

---

### P18-13 — Sun May 3 — Gray rock
**Image**: `p18_13_GrayRock.jpg`
**Scheduled**: 2026-05-04T03:00:00Z (8:00 PM MST May 3)

**Caption:**
```
Gray rock is a communication strategy where you become as uninteresting and unreactive as possible to someone who feeds on your reactions. No emotion. No personal information. No follow-up questions. Just facts about logistics. It feels strange at first because we are conditioned to be warm. But warmth with someone who weaponizes it is fuel. Boring is safety. Pattern18 helps you write gray rock responses without sounding cold or contemptuous, so they hold up if a judge ever reads them. Try it free for 7 days.


#GrayRock #NarcissisticAbuse #CoParenting #BoundarySetting #Pattern18
```

---

### P18-14 — Mon May 4 — BIFF
**Image**: `p18_14_BIFF.jpg`
**Scheduled**: 2026-05-05T03:00:00Z (8:00 PM MST May 4)

**Caption:**
```
BIFF is a communication framework developed by Bill Eddy at the High Conflict Institute. It is the gold standard for written replies in high-conflict situations. Brief means under 4 sentences. Informative means stick to the facts the other person actually needs. Friendly means a warm opener even if you do not feel warm. Firm means do not invite further argument. A BIFF response often ends with a single clear sentence that closes the loop. "I will pick her up at 5pm Friday. Have a good week." That is it. No defending. No explaining. The fight cannot continue if you will not feed it.


#BIFF #CoParenting #ConflictResolution #FamilyCommunication #Pattern18
```

---

## OPALITE BATCH (8 posts)

### Opalite platform schedule (per Opalite skill)
Each Opalite post goes to all 4 platforms at these MST times:
- **LinkedIn**: 7:00 AM MST → ISO `T14:00:00Z`
- **Facebook**: 9:00 AM MST → ISO `T16:00:00Z`
- **Instagram**: 11:00 AM MST → ISO `T18:00:00Z`
- **TikTok**: 12:00 PM MST → ISO `T19:00:00Z`

Stagger times throughout the day for max algorithmic reach.

---

### OP-01 — Tue Apr 21 — Diagnose → Automate → Prove
**Image**: `op_01_DAP_framework.jpg`
**Scheduled times** (Apr 21): LinkedIn 14:00Z | FB 16:00Z | IG 18:00Z | TikTok 19:00Z

**Caption:**
```
Most AI agencies sell automation before they understand the problem. They install something, charge for it, and disappear. Three months later the client cannot tell you whether it actually worked. Opalite Systems runs every engagement on three steps. Diagnose. Automate. Prove. We measure baseline metrics first because without data you are just guessing. We build the automation second, scoped to what the data showed. We prove the result third, with numbers the client can read in their own dashboard. The order matters. Without the diagnosis, the automation is a hope. Without the proof, the work is invisible.


#AIAutomation #ServiceBusiness #BusinessAutomation #AIForBusiness
```

---

### OP-02 — Wed Apr 22 — Show your work — FIRST COMMENT NEEDED (IG + FB)
**Image**: `op_02_medspa_voicemail.jpg`
**Scheduled times** (Apr 22): LinkedIn 14:00Z | FB 16:00Z | IG 18:00Z | TikTok 19:00Z

**Caption:**
```
A Connecticut med spa came through our intake last week. Owner thought she had a marketing problem. She did not. The data showed 73% of her after-hours inbound calls were going to voicemail and never returning a callback. At an average treatment value of $800, that was 3 lost bookings per month. $2,400 walking out the door every 30 days. Marketing was not the leak. Response was. The fix is not another ad campaign. It is a voice agent that picks up at 9pm and books the consult before the prospect calls a competitor. The diagnosis took 3 minutes. The automation took less than a week. The proof shows up in her booking calendar within 30 days.


#MedSpa #BusinessGrowth #AIAutomation #LeadGeneration
```

**FIRST COMMENT (manual, IG + FB only):** `opalitesystems.com/intake`

---

### OP-03 — Thu Apr 23 — Cost of Inaction
**Image**: `op_03_cost_inaction.jpg`
**Scheduled times** (Apr 23): LinkedIn 14:00Z | FB 16:00Z | IG 18:00Z | TikTok 19:00Z

**Caption:**
```
Run the math on your own business. 20 inbound leads per month. Industry average says 15% will be lost to slow response time. That is 3 leads. At $3,500 per closed engagement, that is $10,500 of revenue you never see. Every month. The leak does not show up on a P&L because it is invisible by design. The leads that did not respond never make it into your CRM. The prospects who called a competitor never tell you they did. You only see the gap when you measure it. Most service businesses are losing a six-figure annual revenue stream they have never named.


#BusinessAutomation #SmallBusinessGrowth #LeadResponse #ServiceBusiness
```

---

### OP-04 — Sat Apr 25 — Anti-Guru
**Image**: `op_04_anti_guru.jpg`
**Scheduled times** (Apr 25): LinkedIn 14:00Z | FB 16:00Z | IG 18:00Z | TikTok 19:00Z

**Caption:**
```
The AI services space has filled up with people selling courses on how to start an AI agency. The play is usually the same. Charge $5,000 to install a few off-the-shelf tools. Disappear. Hope the client cannot tell whether it worked. The reason this happens is that without baseline metrics, no one can tell whether it worked. The agency does not have to prove anything. The client does not know what to ask for. AI services have to be measured to be worth what they cost. That is the difference between an automation that pays for itself and a tool that sits in the corner. Diagnose. Automate. Prove. The order matters.


#AIAutomation #BusinessOwners #ServiceBusiness #Entrepreneur
```

---

### OP-05 — Tue Apr 28 — Industry Secrets
**Image**: `op_05_red_flags.jpg`
**Scheduled times** (Apr 28): LinkedIn 14:00Z | FB 16:00Z | IG 18:00Z | TikTok 19:00Z

**Caption:**
```
If you are evaluating an AI agency, four questions tell you most of what you need to know. One: how do you measure baseline metrics before you build anything? If they do not, you cannot prove the work did anything. Two: what specific number will you improve, and by how much, in the first 90 days? Vague answers signal vague work. Three: what happens if the metric does not move? A real partner has a plan for that. Four: who owns the system after launch, and what does ongoing optimization look like? Set-and-forget AI is set-and-fail AI. The answers separate operators from sales pitches.


#AIForBusiness #BusinessAutomation #SmallBusiness #ServiceBusiness
```

---

### OP-06 — Wed Apr 29 — Before/After — FIRST COMMENT NEEDED (IG + FB)
**Image**: `op_06_before_after.jpg`
**Scheduled times** (Apr 29): LinkedIn 14:00Z | FB 16:00Z | IG 18:00Z | TikTok 19:00Z

**Caption:**
```
73% of one med spa's after-hours leads were going to voicemail. Three weeks after the new system went live, that number is zero. The system. An AI voice agent picking up every call, qualifying the lead, and booking the consult on the calendar within 60 seconds. Time to first booking from the new system. 4 days. Time to break-even on the engagement. 3 weeks. The math on AI for service businesses is rarely about doing something exotic. It is about closing the gap between when a lead reaches out and when someone responds. That gap is usually where the money is.


#AIAutomation #ServiceBusiness #BusinessGrowth #LeadResponse
```

**FIRST COMMENT (manual, IG + FB only):** `opalitesystems.com/intake`

---

### OP-07 — Thu Apr 30 — Brand POV
**Image**: `op_07_response_problem.jpg`
**Scheduled times** (Apr 30): LinkedIn 14:00Z | FB 16:00Z | IG 18:00Z | TikTok 19:00Z

**Caption:**
```
Service business owners spend on ads. They hire SDRs. They redesign websites. They try new CRMs. Most of them are solving the wrong problem. The data we see across med spas, law firms, and brokerages says the same thing every time. The leads are coming in. The conversion is failing in the 60 minutes after the lead arrives. Slow response to inbound is the largest preventable revenue leak in service businesses today. The fix is not more leads. It is a system that responds in seconds, qualifies the prospect, and books the call before they hear back from a competitor.


#BusinessAutomation #ServiceBusiness #SmallBusiness #LeadGeneration
```

---

### OP-08 — Fri May 2 — Founding Partner Scarcity — FIRST COMMENT NEEDED (IG + FB)
**Image**: `op_08_founding_partner.jpg`
**Scheduled times** (May 2): LinkedIn 14:00Z | FB 16:00Z | IG 18:00Z | TikTok 19:00Z

**Caption:**
```
Opalite Systems takes on 2 new founding partners per month. The ones who sign in May lock their rate forever, and we cover one add-on for the first 3 months while their system gets dialed in. They pick what fits best. A chat widget for the website, a voice agent for after-hours calls, or ongoing optimization on what they already have. The founding partner rate is closing for May once the second spot fills. The 3-minute intake at opalitesystems.com/intake tells you within a week whether your business has the kind of leak we can fix. If it does, you keep the rate. If it does not, we will tell you.


#BusinessAutomation #FoundingPartner #AIAutomation #SmallBusinessGrowth
```

**FIRST COMMENT (manual, IG + FB only):** `opalitesystems.com/intake`

---

## END OF SPEC
