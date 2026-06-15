import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const userId = await requireAuth(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { email, promoCode } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Check if customer already exists with active/trialing subscription
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 5,
    });

    console.log('Stripe checkout: found', existingCustomers.data.length, 'existing customers for', email);

    let skipCheckout = false;
    for (const customer of existingCustomers.data) {
      // Fetch active subs
      const activeSubs = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
      });
      // Fetch trialing subs
      const trialingSubs = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'trialing',
      });

      const validSubs = [...activeSubs.data, ...trialingSubs.data];

      console.log('Stripe checkout: customer', customer.id,
        '| active:', activeSubs.data.length,
        '| trialing:', trialingSubs.data.length,
        '| statuses:', validSubs.map(s => `${s.id}=${s.status}`).join(', ') || 'none'
      );

      if (validSubs.length > 0) {
        console.log('Stripe checkout: SKIP — active/trialing sub found for customer', customer.id);
        skipCheckout = true;
        break;
      }
    }

    if (skipCheckout) {
      return NextResponse.json({
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://coach.pattern18.com'}/coach?success=true`,
        message: 'You already have an active subscription'
      });
    }

    console.log('Stripe checkout: PROCEED — no active/trialing subscription, creating checkout session');

    // Get the price ID from environment
    const priceId = process.env.STRIPE_PRICE_ID;
    console.log('Stripe checkout: using price ID:', priceId || 'NOT SET');
    if (!priceId) {
      console.error('STRIPE_PRICE_ID not configured');
      return NextResponse.json({ error: 'Payment not configured' }, { status: 500 });
    }

    // Determine the base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://coach.pattern18.com';

    // Reuse an existing Stripe customer for this email, or create one, so the
    // customer is not duplicated and webhooks can map the payment back to this user.
    let customerId: string;
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email,
        metadata: { userId },
      });
      customerId = customer.id;
    }

    // Persist the Stripe customer id to the user's profile (service role,
    // bypasses RLS) so subscription webhooks can resolve the user by it.
    await supabaseAdmin
      .from('profiles')
      .upsert({ id: userId, stripe_customer_id: customerId }, { onConflict: 'id' });

    // Build checkout session options
    const sessionOptions: any = {
      mode: 'subscription',
      payment_method_collection: 'always',
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7,
        metadata: { userId },
      },
      metadata: { userId },
      success_url: `${baseUrl}/thank-you`,
      cancel_url: `${baseUrl}/login?canceled=true`,
    };

    // If coupon code provided, apply it; otherwise allow manual entry
   // If promo code provided, look it up and apply it
   if (promoCode) {
    try {
      const promoCodes = await stripe.promotionCodes.list({
        code: promoCode,
        active: true,
        limit: 1,
      });
      if (promoCodes.data.length > 0) {
        sessionOptions.discounts = [{ promotion_code: promoCodes.data[0].id }];
      } else {
        sessionOptions.allow_promotion_codes = true;
      }
    } catch {
      sessionOptions.allow_promotion_codes = true;
    }
  } else {
    sessionOptions.allow_promotion_codes = true;
  }
    const session = await stripe.checkout.sessions.create(sessionOptions);

    if (!session.url) {
      console.error('Stripe checkout session created but url is null. Session ID:', session.id);
      return NextResponse.json({ error: 'Checkout session created but no redirect URL returned' }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}