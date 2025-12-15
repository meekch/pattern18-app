import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
})

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const email = session.customer_email

    if (email) {
      try {
        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
        const userExists = existingUsers.users.find(u => u.email === email)

        if (!userExists) {
          // Create new user and send invite email
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            redirectTo: 'https://coach.pattern18.com/auth/callback',
          })

          if (createError) {
            console.error('Error creating user:', createError)
          } else {
            console.log('Created and invited user:', newUser.user?.id)
          }
        } else {
          // User exists, send magic link
          const { error: otpError } = await supabaseAdmin.auth.signInWithOtp({
            email: email,
            options: {
              emailRedirectTo: 'https://coach.pattern18.com/auth/callback',
            },
          })

          if (otpError) {
            console.error('Error sending magic link:', otpError)
          } else {
            console.log('Magic link sent to:', email)
          }
        }

        // Store subscription info
        const { error: dbError } = await supabaseAdmin
          .from('user_subscriptions')
          .upsert({
            email: email,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            status: 'active',
            created_at: new Date().toISOString(),
          }, {
            onConflict: 'email'
          })

        if (dbError) {
          console.error('Error storing subscription:', dbError)
        }

      } catch (error) {
        console.error('Webhook processing error:', error)
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    
    await supabaseAdmin
      .from('user_subscriptions')
      .update({ status: 'cancelled' })
      .eq('stripe_subscription_id', subscription.id)
  }

  return NextResponse.json({ received: true })
}