'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // User is logged in, check subscription
        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('email', session.user.email?.toLowerCase())
          .in('status', ['active', 'trialing'])
          .single();

        if (subscription) {
          router.push('/coach');
        } else {
          router.push('/subscribe');
        }
      } else {
        // Not logged in, go to login
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="loading">
      <div className="icon">💚</div>
      <p>Loading Pattern 18...</p>
      <style jsx>{`
        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f5f7f6 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .icon {
          font-size: 48px;
          margin-bottom: 16px;
          animation: pulse 1.5s ease-in-out infinite;
        }
        p {
          color: #666;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}