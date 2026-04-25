import { Resend } from 'resend';

// Centralised email send. Honors DEV_MODE: when DEV_MODE=true, the message
// is logged to the server console instead of being sent through Resend.
// Flip DEV_MODE=false to actually deliver.

export interface SendEmailArgs {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail(args: SendEmailArgs): Promise<{ ok: boolean; mode: 'dev' | 'live'; id?: string; error?: string }> {
  const isDev = process.env.DEV_MODE !== 'false'; // default: dev
  const from = args.from ?? 'Pattern18 <hello@pattern18.com>';

  if (isDev) {
    const previewBody = (args.text ?? args.html ?? '').slice(0, 240).replace(/\s+/g, ' ');
    // eslint-disable-next-line no-console
    console.log('[DEV_MODE email skipped]', {
      to: args.to,
      from,
      subject: args.subject,
      preview: previewBody,
    });
    return { ok: true, mode: 'dev' };
  }

  if (!process.env.RESEND_API_KEY) {
    return { ok: false, mode: 'live', error: 'RESEND_API_KEY not set' };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const payload: Record<string, unknown> = {
      from,
      to: args.to,
      subject: args.subject,
    };
    if (args.html) payload.html = args.html;
    if (args.text) payload.text = args.text;
    if (args.replyTo) payload.replyTo = args.replyTo;
    if (!args.html && !args.text) {
      return { ok: false, mode: 'live', error: 'sendEmail: must provide html or text' };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await resend.emails.send(payload as any);
    if (error) return { ok: false, mode: 'live', error: error.message ?? String(error) };
    return { ok: true, mode: 'live', id: data?.id };
  } catch (e: unknown) {
    return { ok: false, mode: 'live', error: e instanceof Error ? e.message : String(e) };
  }
}
