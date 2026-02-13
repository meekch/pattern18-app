import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireAuth } from '@/lib/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const userId = await requireAuth(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { email, promoCode } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Check if customer already exists with active subscription
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      const customerId = existingCustomers.data[0].id;
      
      // Check for active subscriptions
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        // Already has active subscription - redirect to coach
        return NextResponse.json({ 
          url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://coach.pattern18.com'}/coach`,
          message: 'You already have an active subscription'
        });
      }

      // Also check for trialing subscriptions
      const trialingSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: 'trialing',
        limit: 1,
      });

      if (trialingSubs.data.length > 0) {
        return NextResponse.json({ 
          url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://coach.pattern18.com'}/coach`,
          message: 'You already have an active trial'
        });
      }
    }

    // Get the price ID from environment
    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      console.error('STRIPE_PRICE_ID not configured');
      return NextResponse.json({ error: 'Payment not configured' }, { status: 500 });
    }

    // Determine the base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://coach.pattern18.com';

    // Build checkout session options
    const sessionOptions: any = {
      mode: 'subscription',
      payment_method_collection: 'always',
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7,
      },
      success_url: `${baseUrl}/coach?success=true`,
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

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}