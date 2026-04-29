// Shared feedback routing for the unified /coach chat.
// Inserts a row into pattern18_feedback (service role) and emails the
// content to hello@pattern18.com. Used by:
//   - /api/coach when the server-side regex classifies a message as feedback
//   - /api/coach-feedback when a user clicks "Send to Christy →" on a message

import { createClient } from '@supabase/supabase-js';
import { sendEmail } from './email-send';

export type FeedbackIntent = 'feedback' | 'manual_override' | 'knowledge' | 'analysis';

export interface RouteFeedbackArgs {
  userId: string | null;
  userEmail: string | null;
  message: string;
  intent: FeedbackIntent;
  pathname: string | null;
  userAgent: string | null;
}

export interface RouteFeedbackResult {
  ok: boolean;
  insertError?: string;
  emailMode?: 'dev' | 'live';
  emailError?: string;
}

const FEEDBACK_RECIPIENT = 'hello@pattern18.com';

function azTimestamp(d: Date): string {
  // Arizona is MST year-round (UTC-7, no DST).
  const az = new Date(d.getTime() - 7 * 60 * 60 * 1000);
  return az.toISOString().replace('T', ' ').replace('Z', '') + ' AZ (MST, UTC-7)';
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function routeFeedback(args: RouteFeedbackArgs): Promise<RouteFeedbackResult> {
  const result: RouteFeedbackResult = { ok: true };
  const now = new Date();

  // 1) Persist to Supabase via service role.
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { error } = await supabase.from('pattern18_feedback').insert({
      user_id: args.userId,
      user_email: args.userEmail,
      message_content: args.message,
      intent_classification: args.intent,
      route_when_sent: args.pathname,
      user_agent: args.userAgent,
    });
    if (error) {
      console.error('pattern18_feedback insert error:', error);
      result.ok = false;
      result.insertError = error.message;
    }
  } catch (err) {
    console.error('pattern18_feedback insert threw:', err);
    result.ok = false;
    result.insertError = err instanceof Error ? err.message : String(err);
  }

  // 2) Send email to admin. Failures here don't block the user-facing
  // ack — DB row is the durable record; email is the human-notify layer.
  const sender = args.userEmail || args.userId || 'unknown user';
  const preview = args.message.slice(0, 60).replace(/\s+/g, ' ');
  const subject = `Pattern18 feedback from ${sender} — ${preview}${args.message.length > 60 ? '…' : ''}`;
  const replyMailto = args.userEmail
    ? `<a href="mailto:${args.userEmail}?subject=Re:%20your%20Pattern18%20feedback">Reply to ${args.userEmail}</a>`
    : '';

  const text = `Pattern18 feedback received.

Intent: ${args.intent}
User ID: ${args.userId ?? '(anonymous)'}
User email: ${args.userEmail ?? '(not captured)'}
Route: ${args.pathname ?? '(unknown)'}
User agent: ${args.userAgent ?? '(unknown)'}
Time: ${azTimestamp(now)}

--- Message ---
${args.message}
--- End message ---

${args.userEmail ? `Reply to user: ${args.userEmail}` : 'No reply address captured.'}`;

  const html = `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;font-family:'Inter',-apple-system,sans-serif;color:#1F2937;">
  <tr><td style="padding:8px 0;"><strong>Intent:</strong> ${escHtml(args.intent)}</td></tr>
  <tr><td style="padding:4px 0;"><strong>User ID:</strong> ${escHtml(args.userId ?? '(anonymous)')}</td></tr>
  <tr><td style="padding:4px 0;"><strong>User email:</strong> ${escHtml(args.userEmail ?? '(not captured)')}</td></tr>
  <tr><td style="padding:4px 0;"><strong>Route:</strong> ${escHtml(args.pathname ?? '(unknown)')}</td></tr>
  <tr><td style="padding:4px 0;"><strong>User agent:</strong> <span style="color:#6b7280;font-size:12px;">${escHtml(args.userAgent ?? '(unknown)')}</span></td></tr>
  <tr><td style="padding:4px 0;"><strong>Time:</strong> ${escHtml(azTimestamp(now))}</td></tr>
</table>
<div style="margin:18px 0;padding:14px 16px;background:#EAF5F3;border-left:3px solid #2F9D94;border-radius:6px;white-space:pre-wrap;font-family:'Inter',-apple-system,sans-serif;line-height:1.55;color:#1F2937;">${escHtml(args.message)}</div>
${replyMailto ? `<p style="margin:14px 0 0;">${replyMailto}</p>` : '<p style="margin:14px 0 0;color:#6b7280;">No reply address captured.</p>'}
`;

  try {
    const sent = await sendEmail({
      to: FEEDBACK_RECIPIENT,
      subject,
      text,
      html,
      replyTo: args.userEmail ?? undefined,
    });
    result.emailMode = sent.mode;
    if (!sent.ok) {
      result.emailError = sent.error;
      // Log but don't fail the user-facing call. DB row is durable.
      console.error('Feedback email send failed:', sent.error);
    }
  } catch (err) {
    result.emailError = err instanceof Error ? err.message : String(err);
    console.error('Feedback email threw:', err);
  }

  return result;
}

// Server-side intent classifier. Conservative: only classifies as
// "feedback" when strong product-feedback signals appear AND the message
// is short enough that it's unlikely to be a pasted co-parent message.
// Default behavior elsewhere is "analysis" (existing primary use case).
// Conservative product-feedback signals. We deliberately restrict
// "broken" to UI surfaces (button/page/upload/etc.) so phrases like
// "the order is broken" or "the trust is broken" don't false-positive.
const FEEDBACK_PATTERNS: RegExp[] = [
  /\b(this|it)\s+(is|seems?)\s+broken\b/i,
  /\bthe\s+(button|page|app|site|feature|form|link|upload|export|filter|search|tab|input|chat|coach|email)\s+(is|seems?)\s+broken\b/i,
  /\bdoesn'?t\s+work\b/i,
  /\bisn'?t\s+working\b/i,
  /\bwon'?t\s+(work|load|open|save|submit)\b/i,
  /\bwish\s+(there\s+was|i\s+could|it\s+would|you\s+(would|could))\b/i,
  /\bwould\s+love\s+(if|to|a\b|the\s+ability)/i,
  /\bcan\s+you\s+(add|build|make|fix)\b/i,
  /\b(feature\s+request|bug\s+report|crash(ed|ing)?|froze|frozen|glitch)\b/i,
  /\berror\s+message\b/i,
  /\bmissing\s+(a|the|an)\s+(button|feature|option|page|tab|field)\b/i,
];

export function classifyFeedback(message: string): boolean {
  const trimmed = message.trim();
  if (trimmed.length === 0 || trimmed.length > 600) return false;
  return FEEDBACK_PATTERNS.some((re) => re.test(trimmed));
}

// Canned acknowledgment streamed back when feedback intent detected.
// Trauma-informed, warm without being saccharine, no em dashes.
export const FEEDBACK_ACK_TEXT = `Thanks for flagging this, I've sent it to Christy directly. She reads every one of these. If you want to add more detail or context, just keep typing.`;
