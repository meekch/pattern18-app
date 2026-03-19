# Pattern 18

## What This Is
Pattern 18 is a $89/month SaaS platform helping protective parents document coercive control in high-conflict custody situations. The name refers to children turning 18 and gaining freedom from court-ordered situations.

## Tech Stack
- Next.js 14 (App Router)
- TypeScript
- Supabase (auth, database, storage)
- Stripe (payments)
- Tailwind CSS (inline styles currently)
- Vercel (deployment)

## Brand Guidelines
- Primary green: #1a3a2f (dark), #059669 (accent)
- Secondary: #d1fae5 (light green backgrounds)
- Error/Critical: #dc2626
- Warning: #f59e0b
- NO purple (#7c3aed) - that's not our brand
- Clean, professional, trauma-informed design
- Mobile-first

## Key Features
- Coach: AI chat for guidance and response suggestions
- My Case: Dashboard showing patterns and statistics  
- Evidence: Browse, filter, edit incidents with pattern detection
- Docs: Generate court exhibits and declarations

## Database Tables
- users (Supabase auth)
- incidents (evidence with patterns, severity, messages_json)
- court_documents (uploaded orders, parenting plans)
- case_info (case number, court, parties, user role)
- subscriptions (Stripe integration)

## Important Concepts
- Petitioner vs Respondent: Roles lock at original filing, never change
- include_in_exhibit: Boolean flag for which incidents go in court documents
- Coercive control patterns: 18 documented patterns with clinical sources
- Severity levels: critical, high, medium, low, none

## Code Style
- Functional React components
- Inline styles (not CSS modules)
- Server components where possible
- API routes in /api folder
- No unnecessary comments
- Concise, readable code

## Common Pitfalls
- Don't use purple branding
- Don't expose API costs to users
- Don't flag normal logistics as abuse (context matters)
- Always provide git commands when asking to push
- Specify exact filenames for code updates

## Testing
- Test on mobile viewport
- Check Supabase RLS policies
- Verify auth state before database operations

## Current Focus
- AI-powered pattern detection accuracy
- Court document generation
- Beta tester onboarding (Dr. Liane Leedom, Donna from Love Fraud)

## AI Automation & Reporting (Added March 2026)

### n8n Workflow
Report generation runs entirely in n8n — NOT in this codebase.
Workflow: Receive Lead Data → Generate AI Report (Claude API) → Send via Resend → Save to Supabase
To update the report prompt: edit the n8n node directly.

### Social Media
- TikTok: @thecounterparent
- Facebook: Pattern18 Coach page
- Never cross-post with Opalite Systems accounts
- Content managed via Blotato

### Critical Rules (do not change)
- Supabase service role key: server-side only, never client components
- Chat flow is deterministic — Claude API generates acknowledgement text only
- Keep Pattern18 code completely separate from Opalite Systems
