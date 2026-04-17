'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Metrics {
  mrr: number;
  arr: number;
  totalSubscribers: number;
  survivorCount: number;
  litigationCount: number;
  firmCount: number;
  trialCount: number;
  churnedThisMonth: number;
  newThisMonth: number;
  churnRate: number;
}

interface Subscriber {
  id: string;
  email: string;
  tier: string;
  status: string;
  created_at: string;
  current_period_end: string;
}

export default function AdminMetricsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [metrics, setMetrics] = useState<Metrics>({
    mrr: 0,
    arr: 0,
    totalSubscribers: 0,
    survivorCount: 0,
    litigationCount: 0,
    firmCount: 0,
    trialCount: 0,
    churnedThisMonth: 0,
    newThisMonth: 0,
    churnRate: 0,
  });
  const [recentSubscribers, setRecentSubscribers] = useState<Subscriber[]>([]);

  // Pricing for calculations
  const PRICES = {
    survivor: 97,
    litigation: 97,
    firm_solo: 299,
    firm_small: 799,
    firm_full: 1999,
  };

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Only allow specific admin emails
    const adminEmails = ['christymeek@yahoo.com', 'hello@pattern18.com'];
    
    if (!session?.user || !adminEmails.includes(session.user.email || '')) {
      router.push('/coach');
      return;
    }

    setAuthorized(true);
    await loadMetrics();
  };

  const loadMetrics = async () => {
    try {
      // Get all subscriptions
      const { data: subs, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Calculate metrics
      const activeSubs = subs?.filter(s => 
        s.status === 'active' || s.status === 'trialing'
      ) || [];

      const survivorCount = activeSubs.filter(s => 
        s.tier === 'survivor' || s.tier === 'pro'
      ).length;

      const litigationCount = activeSubs.filter(s => 
        s.tier === 'litigation'
      ).length;

      const firmCount = activeSubs.filter(s => 
        s.tier?.startsWith('firm')
      ).length;

      const trialCount = activeSubs.filter(s => 
        s.status === 'trialing'
      ).length;

      // MRR calculation
      let mrr = 0;
      activeSubs.forEach(sub => {
        if (sub.status === 'active') {
          if (sub.tier === 'survivor' || sub.tier === 'pro') mrr += PRICES.survivor;
          else if (sub.tier === 'litigation') mrr += PRICES.litigation;
          else if (sub.tier === 'firm_solo') mrr += PRICES.firm_solo;
          else if (sub.tier === 'firm_small') mrr += PRICES.firm_small;
          else if (sub.tier === 'firm_full') mrr += PRICES.firm_full;
        }
      });

      // New this month
      const newThisMonth = subs?.filter(s => 
        new Date(s.created_at) >= startOfMonth
      ).length || 0;

      // Churned this month (canceled or past_due)
      const churnedThisMonth = subs?.filter(s => 
        (s.status === 'canceled' || s.status === 'past_due') &&
        s.canceled_at && new Date(s.canceled_at) >= startOfMonth
      ).length || 0;

      // Churn rate (churned / total at start of period)
      const totalAtStartOfMonth = (subs?.length || 0) - newThisMonth;
      const churnRate = totalAtStartOfMonth > 0 
        ? (churnedThisMonth / totalAtStartOfMonth) * 100 
        : 0;

      setMetrics({
        mrr,
        arr: mrr * 12,
        totalSubscribers: activeSubs.length,
        survivorCount,
        litigationCount,
        firmCount,
        trialCount,
        churnedThisMonth,
        newThisMonth,
        churnRate,
      });

      // Recent subscribers for the table
      const recent = subs?.slice(0, 20).map(s => ({
        id: s.id,
        email: s.user_email || 'Unknown',
        tier: s.tier || 'Unknown',
        status: s.status,
        created_at: s.created_at,
        current_period_end: s.current_period_end,
      })) || [];

      setRecentSubscribers(recent);

    } catch (err) {
      console.error('Failed to load metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#059669';
      case 'trialing': return '#3b82f6';
      case 'past_due': return '#f59e0b';
      case 'canceled': return '#dc2626';
      default: return '#6b7280';
    }
  };

  // Exit milestones
  const milestones = [
    { label: '$10K MRR', target: 10000, description: 'Proof of concept' },
    { label: '$50K MRR', target: 50000, description: 'Serious traction' },
    { label: '$100K MRR', target: 100000, description: 'Acquisition interest' },
    { label: '$250K MRR', target: 250000, description: '$3M ARR = $9-30M exit' },
  ];

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8faf9' }}>
        <p>Loading metrics...</p>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8faf9', padding: '24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <button 
            onClick={() => router.push('/coach')}
            style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', marginBottom: 16 }}
          >
            ← Back to Coach
          </button>
          <h1 style={{ margin: 0, fontSize: 28, color: '#1a3a2f' }}>📊 Business Metrics</h1>
          <p style={{ margin: '8px 0 0', color: '#6b7280' }}>Track your path to exit</p>
        </div>

        {/* Main Metrics */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: 20, 
          marginBottom: 32 
        }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', 
            borderRadius: 16, 
            padding: 24, 
            color: 'white' 
          }}>
            <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>MRR</div>
            <div style={{ fontSize: 36, fontWeight: 800 }}>{formatCurrency(metrics.mrr)}</div>
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>Monthly Recurring Revenue</div>
          </div>

          <div style={{ 
            background: 'white', 
            borderRadius: 16, 
            padding: 24, 
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)' 
          }}>
            <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>ARR</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#1a3a2f' }}>{formatCurrency(metrics.arr)}</div>
            <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>Annual Run Rate</div>
          </div>

          <div style={{ 
            background: 'white', 
            borderRadius: 16, 
            padding: 24, 
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)' 
          }}>
            <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>Active Subscribers</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#1a3a2f' }}>{metrics.totalSubscribers}</div>
            <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>{metrics.trialCount} on trial</div>
          </div>

          <div style={{ 
            background: 'white', 
            borderRadius: 16, 
            padding: 24, 
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)' 
          }}>
            <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>Churn Rate</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: metrics.churnRate > 5 ? '#dc2626' : '#1a3a2f' }}>
              {metrics.churnRate.toFixed(1)}%
            </div>
            <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>{metrics.churnedThisMonth} lost this month</div>
          </div>
        </div>

        {/* Tier Breakdown */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: 20, 
          marginBottom: 32 
        }}>
          <div style={{ 
            background: 'white', 
            borderRadius: 16, 
            padding: 24, 
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            borderLeft: '4px solid #3b82f6'
          }}>
            <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>Pattern18 ($97)</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#1F2937' }}>{metrics.survivorCount}</div>
            <div style={{ fontSize: 13, color: '#2F9D94', marginTop: 4 }}>
              {formatCurrency(metrics.survivorCount * PRICES.survivor)}/mo
            </div>
          </div>

          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            borderLeft: '4px solid #1A5F5A'
          }}>
            <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>Legacy Litigation ($97)</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#1F2937' }}>{metrics.litigationCount}</div>
            <div style={{ fontSize: 13, color: '#2F9D94', marginTop: 4 }}>
              {formatCurrency(metrics.litigationCount * PRICES.litigation)}/mo
            </div>
          </div>

          <div style={{ 
            background: 'white', 
            borderRadius: 16, 
            padding: 24, 
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            borderLeft: '4px solid #f59e0b'
          }}>
            <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>Law Firms</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#1a3a2f' }}>{metrics.firmCount}</div>
            <div style={{ fontSize: 13, color: '#059669', marginTop: 4 }}>B2B (higher multiple)</div>
          </div>
        </div>

        {/* Exit Milestones */}
        <div style={{ 
          background: '#1a3a2f', 
          borderRadius: 16, 
          padding: 24, 
          marginBottom: 32,
          color: 'white'
        }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 18 }}>🎯 Exit Milestones</h3>
          <div style={{ display: 'flex', gap: 16 }}>
            {milestones.map((m, i) => {
              const progress = Math.min((metrics.mrr / m.target) * 100, 100);
              const isComplete = metrics.mrr >= m.target;
              
              return (
                <div key={i} style={{ flex: 1 }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: 8
                  }}>
                    <span style={{ fontWeight: 600 }}>{m.label}</span>
                    {isComplete && <span style={{ color: '#22c55e' }}>✓</span>}
                  </div>
                  <div style={{ 
                    background: 'rgba(255,255,255,0.2)', 
                    borderRadius: 8, 
                    height: 8,
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      width: `${progress}%`, 
                      height: '100%', 
                      background: isComplete ? '#22c55e' : '#059669',
                      borderRadius: 8,
                      transition: 'width 0.3s'
                    }} />
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{m.description}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* This Month */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: 20, 
          marginBottom: 32 
        }}>
          <div style={{ 
            background: '#f0fdf4', 
            borderRadius: 16, 
            padding: 24, 
            border: '1px solid #bbf7d0'
          }}>
            <div style={{ fontSize: 14, color: '#059669', marginBottom: 8 }}>New This Month</div>
            <div style={{ fontSize: 48, fontWeight: 800, color: '#059669' }}>+{metrics.newThisMonth}</div>
          </div>

          <div style={{ 
            background: metrics.churnedThisMonth > 0 ? '#fef2f2' : '#f9fafb', 
            borderRadius: 16, 
            padding: 24, 
            border: `1px solid ${metrics.churnedThisMonth > 0 ? '#fecaca' : '#e5e7eb'}`
          }}>
            <div style={{ fontSize: 14, color: metrics.churnedThisMonth > 0 ? '#dc2626' : '#6b7280', marginBottom: 8 }}>
              Churned This Month
            </div>
            <div style={{ fontSize: 48, fontWeight: 800, color: metrics.churnedThisMonth > 0 ? '#dc2626' : '#6b7280' }}>
              -{metrics.churnedThisMonth}
            </div>
          </div>
        </div>

        {/* Recent Subscribers Table */}
        <div style={{ 
          background: 'white', 
          borderRadius: 16, 
          padding: 24, 
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)' 
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, color: '#1a3a2f' }}>Recent Subscribers</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '12px 8px', color: '#6b7280' }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', color: '#6b7280' }}>Tier</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', color: '#6b7280' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', color: '#6b7280' }}>Signed Up</th>
                </tr>
              </thead>
              <tbody>
                {recentSubscribers.map((sub) => (
                  <tr key={sub.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 8px', color: '#374151' }}>{sub.email}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{ 
                        background: '#f3f4f6', 
                        padding: '4px 10px', 
                        borderRadius: 12, 
                        fontSize: 12,
                        fontWeight: 500,
                        textTransform: 'capitalize'
                      }}>
                        {sub.tier}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{ 
                        color: getStatusColor(sub.status),
                        fontWeight: 600,
                        fontSize: 12,
                        textTransform: 'uppercase'
                      }}>
                        {sub.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', color: '#6b7280' }}>
                      {new Date(sub.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Valuation Estimate */}
        <div style={{ 
          marginTop: 32,
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          borderRadius: 16,
          padding: 24,
          border: '2px solid #f59e0b'
        }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 18, color: '#92400e' }}>💰 Estimated Valuation Range</h3>
          <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, color: '#92400e', marginBottom: 4 }}>Conservative (3x ARR)</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#92400e' }}>{formatCurrency(metrics.arr * 3)}</div>
            </div>
            <div style={{ fontSize: 24, color: '#d97706' }}>→</div>
            <div>
              <div style={{ fontSize: 14, color: '#92400e', marginBottom: 4 }}>Optimistic (10x ARR)</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#92400e' }}>{formatCurrency(metrics.arr * 10)}</div>
            </div>
          </div>
          <p style={{ margin: '16px 0 0', fontSize: 13, color: '#92400e', opacity: 0.8 }}>
            B2B revenue and "Pattern 18 Certified" brand moat can push toward higher multiples.
          </p>
        </div>

      </div>
    </div>
  );
}
