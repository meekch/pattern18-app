import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // Get user from session cookie/header
    const authHeader = req.headers.get('authorization');
    
    // For now, get the user from the request body
    const { userId } = await req.json().catch(() => ({}));

    // Or try to get from Supabase session
    let customerId: string | null = null;

    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single();
      
      customerId = profile?.stripe_customer_id;
    }

    if (!customerId) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/my-case`,
    });

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error('Billing portal error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}