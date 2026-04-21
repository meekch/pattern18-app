'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Subscription {
  tier: 'free' | 'paid';
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';
  currentPeriodEnd: Date | null;
  isActive: boolean;
}

const FREE_LIMITS = {
  evidence_saves: 3,
  messages_per_day: 10,
};

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState({ evidenceCount: 0, messagesToday: 0 });

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setSubscription(null);
        setLoading(false);
        return;
      }

      // Get subscription from subscriptions table
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('status, current_period_end')
        .eq('user_id', session.user.id)
        .single();

      // Get usage stats
      const { count: evidenceCount } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      // Get messages sent today
      const today = new Date().toISOString().split('T')[0];
      const { count: messagesToday } = await supabase
        .from('coach_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .gte('created_at', today);

      setUsage({
        evidenceCount: evidenceCount || 0,
        messagesToday: messagesToday || 0,
      });

      // If they have an active subscription, they're paid
      const isActive = subData?.status === 'active';
      const tier = isActive ? 'paid' : 'free';

      setSubscription({
        tier,
        status: (subData?.status || 'incomplete') as Subscription['status'],
        currentPeriodEnd: subData?.current_period_end ? new Date(subData.current_period_end) : null,
        isActive,
      });

    } catch (error) {
      console.error('Failed to load subscription:', error);
      // Default to free on error
      setSubscription({
        tier: 'free',
        status: 'incomplete',
        currentPeriodEnd: null,
        isActive: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const checkLimit = (type: 'evidence' | 'messages'): { allowed: boolean; remaining: number; limit: number } => {
    // While loading, allow everything
    if (loading) {
      return { allowed: true, remaining: Infinity, limit: Infinity };
    }

    // Paid users get unlimited
    if (subscription?.tier === 'paid' && subscription?.isActive) {
      return { allowed: true, remaining: Infinity, limit: Infinity };
    }

    // Free tier limits
    if (type === 'evidence') {
      const limit = FREE_LIMITS.evidence_saves;
      const remaining = Math.max(0, limit - usage.evidenceCount);
      return { allowed: remaining > 0, remaining, limit };
    } else {
      const limit = FREE_LIMITS.messages_per_day;
      const remaining = Math.max(0, limit - usage.messagesToday);
      return { allowed: remaining > 0, remaining, limit };
    }
  };

  const openBillingPortal = async () => {
    try {
      const response = await fetch('/api/stripe/portal', { method: 'POST' });
      const { url, error } = await response.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (error) {
      console.error('Failed to open billing portal:', error);
    }
  };

  return {
    subscription,
    loading,
    usage,
    checkLimit,
    openBillingPortal,
    refresh: loadSubscription,
  };
}

// Simple component to show upgrade prompt
export function UpgradePrompt({
  feature,
  onClose
}: {
  feature: string;
  onClose: () => void;
}) {
  return (
    <div className="upgrade-prompt">
      <div className="upgrade-content">
        <div className="upgrade-icon">⭐</div>
        <h3>Upgrade to Pro</h3>
        <p>You've reached the free limit for {feature}.</p>
        <p>Upgrade to Pro for unlimited access.</p>
        <div className="upgrade-buttons">
          <a href="/pricing" className="upgrade-btn">See Plans</a>
          <button onClick={onClose} className="close-btn">Maybe Later</button>
        </div>
      </div>
      <style jsx>{`
        .upgrade-prompt {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .upgrade-content {
          background: white;
          border-radius: 20px;
          padding: 32px;
          text-align: center;
          max-width: 360px;
        }
        .upgrade-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        h3 {
          font-size: 24px;
          color: #1F2937;
          margin: 0 0 12px;
        }
        p {
          color: #6b7280;
          margin: 0 0 8px;
          font-size: 15px;
        }
        .upgrade-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 24px;
        }
        .upgrade-btn {
          display: block;
          padding: 14px;
          background: #2F9D94;
          color: white;
          text-decoration: none;
          border-radius: 12px;
          font-weight: 600;
        }
        .close-btn {
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}