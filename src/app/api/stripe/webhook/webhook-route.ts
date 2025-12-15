import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log("Webhook event received:", event.type);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const email = session.customer_details?.email;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!email) {
          console.error("No email in checkout session");
          break;
        }

        console.log("Creating user for:", email);

        // Create or update subscription record
        await supabaseAdmin.from("user_subscriptions").upsert(
          {
            email: email.toLowerCase(),
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            status: "active",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "email" }
        );

        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const userExists = existingUsers?.users?.some(
          (u) => u.email?.toLowerCase() === email.toLowerCase()
        );

        if (!userExists) {
          // Invite new user (sends magic link email)
          const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
          if (inviteError) {
            console.error("Error inviting user:", inviteError);
          } else {
            console.log("Invite sent to:", email);
          }
        } else {
          console.log("User already exists:", email);
        }

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        // Map Stripe status to our status
        let status = "active";
        if (subscription.status === "canceled" || subscription.status === "unpaid") {
          status = "canceled";
        } else if (subscription.status === "past_due") {
          status = "past_due";
        } else if (subscription.status === "trialing") {
          status = "active"; // Trial is still active
        } else if (subscription.status === "active") {
          status = "active";
        } else {
          status = subscription.status;
        }

        console.log(`Subscription ${subscription.id} status: ${subscription.status} -> ${status}`);

        await supabaseAdmin
          .from("user_subscriptions")
          .update({ 
            status: status,
            updated_at: new Date().toISOString()
          })
          .eq("stripe_customer_id", customerId);

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log("Subscription canceled for customer:", customerId);

        await supabaseAdmin
          .from("user_subscriptions")
          .update({ 
            status: "canceled",
            updated_at: new Date().toISOString()
          })
          .eq("stripe_customer_id", customerId);

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        console.log("Payment failed for customer:", customerId);

        await supabaseAdmin
          .from("user_subscriptions")
          .update({ 
            status: "past_due",
            updated_at: new Date().toISOString()
          })
          .eq("stripe_customer_id", customerId);

        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}