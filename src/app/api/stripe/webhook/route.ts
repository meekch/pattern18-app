import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Derive the tier from the price the customer actually bought. Reads the launch
// price (STRIPE_PRICE_ID) plus the named PRO/LITIGATION prices so a paying
// customer is never mislabeled 'free'.
function priceToTier(priceId: string | undefined): string {
  if (
    priceId === process.env.STRIPE_PRICE_ID ||
    priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY ||
    priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL
  ) {
    return 'pro';
  }
  if (
    priceId === process.env.NEXT_PUBLIC_STRIPE_LITIGATION_MONTHLY ||
    priceId === process.env.NEXT_PUBLIC_STRIPE_LITIGATION_ANNUAL
  ) {
    return 'litigation';
  }
  return 'free';
}

// Never let a bad epoch reach toISOString(). new Date(NaN).toISOString() throws
// RangeError, and because these conversions happen inside the object literal
// passed to .upsert()/.update(), a throw aborts the handler before anything is
// persisted -- the customer's row stays NULL and Stripe gets a 500.
function epochToISO(epoch: number | null | undefined): string | null {
  return typeof epoch === 'number' && Number.isFinite(epoch)
    ? new Date(epoch * 1000).toISOString()
    : null;
}

// Stripe moved current_period_end off the Subscription object and onto each
// subscription item in API version 2025-03-31.basil. This handler pins
// 2025-11-17.clover, so the old top-level field is always undefined -- read it
// from the item instead.
function periodEndISO(subscription: Stripe.Subscription): string | null {
  const iso = epochToISO(subscription.items?.data?.[0]?.current_period_end);
  if (iso === null) {
    console.warn(
      `[stripe-webhook] no current_period_end on subscription ${subscription.id} ` +
        `(items: ${subscription.items?.data?.length ?? 0}); writing null. ` +
        `Access gating that reads current_period_end will treat this as unset.`
    );
  }
  return iso;
}

async function findUserIdByCustomer(
  supabase: any,
  customerId: string | null
): Promise<string | null> {
  if (!customerId) return null;
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();
  return (data as { id: string } | null)?.id ?? null;
}

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-11-17.clover',
  });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const userId =
          session.metadata?.userId ||
          (await findUserIdByCustomer(supabase, customerId));

        if (userId && subscriptionId) {
          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items.data[0]?.price.id;
          const tier = priceToTier(priceId);

          await supabase
            .from('profiles')
            .upsert({
              id: userId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              subscription_tier: tier,
              subscription_status: subscription.status,
              trial_ends_at: epochToISO(subscription.trial_end),
              current_period_end: periodEndISO(subscription),
            }, { onConflict: 'id' });
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const userId =
          subscription.metadata?.userId ||
          (await findUserIdByCustomer(supabase, customerId));

        if (userId) {
          const priceId = subscription.items.data[0]?.price.id;
          const tier = priceToTier(priceId);

          await supabase
            .from('profiles')
            .update({
              stripe_customer_id: customerId,
              stripe_subscription_id: subscription.id,
              subscription_tier: tier,
              subscription_status: subscription.status,
              trial_ends_at: epochToISO(subscription.trial_end),
              current_period_end: periodEndISO(subscription),
            })
            .eq('id', userId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const userId =
          subscription.metadata?.userId ||
          (await findUserIdByCustomer(supabase, customerId));

        if (userId) {
          await supabase
            .from('profiles')
            .update({
              subscription_tier: 'free',
              subscription_status: subscription.status,
              stripe_subscription_id: null,
            })
            .eq('id', userId);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          await supabase
            .from('profiles')
            .update({ subscription_status: 'past_due' })
            .eq('id', profile.id);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    // Stripe still sees the generic message, but the log names the event so the
    // next failure is one grep rather than a dashboard hunt.
    console.error(
      `[stripe-webhook] handler error on ${event.type} (${event.id}):`,
      error?.stack ?? error
    );
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

