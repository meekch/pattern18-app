import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
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
        const userId = session.metadata?.userId;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (userId && subscriptionId) {
          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items.data[0]?.price.id;
          
          // Determine tier from price ID
          let tier = 'free';
          if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY || 
              priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL) {
            tier = 'pro';
          } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_LITIGATION_MONTHLY ||
                     priceId === process.env.NEXT_PUBLIC_STRIPE_LITIGATION_ANNUAL) {
            tier = 'litigation';
          }

          await supabase
            .from('profiles')
            .upsert({
              id: userId,
              stripe_customer_id: customerId,

              stripe_subscription_id: subscriptionId,
              subscription_tier: tier,
              subscription_status: subscription.status,
              trial_ends_at: (subscription as any).trial_end 
                ? new Date((subscription as any).trial_end * 1000).toISOString() 
                : null,
              current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
            }, { onConflict: 'id' });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          const priceId = subscription.items.data[0]?.price.id;
          
          let tier = 'free';
          if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY || 
              priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL) {
            tier = 'pro';
          } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_LITIGATION_MONTHLY ||
                     priceId === process.env.NEXT_PUBLIC_STRIPE_LITIGATION_ANNUAL) {
            tier = 'litigation';
          }

          await supabase
            .from('profiles')
            .update({
              subscription_tier: tier,
              subscription_status: subscription.status,
              trial_ends_at: (subscription as any).trial_end 
                ? new Date((subscription as any).trial_end * 1000).toISOString() 
                : null,
              current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
            })
            .eq('id', profile.id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          await supabase
            .from('profiles')
            .update({
              subscription_tier: 'free',
              subscription_status: 'canceled',
              stripe_subscription_id: null,
            })
            .eq('id', profile.id);
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
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

