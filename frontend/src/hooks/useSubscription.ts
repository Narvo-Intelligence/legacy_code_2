import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import * as api from '../lib/api';
import logger from '../lib/logger';
import { asRecord } from '../lib/validators';

export interface SubscriptionData {
  [key: string]: any;
  tier: string;
  status: string;
  next_billing_date?: string;
  tier_name?: string;
}

export const useSubscription = (userId: string | undefined) => {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchSubscription = useCallback(async (silent = false) => {
    if (!userId || userId === 'guest') {
      setSubscription({ tier: 'free', status: 'active', tier_name: 'Standard Tier' });
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    setError(null);

    try {
      const res = await api.get(`api/subscription/${userId}`);
      if (res.ok) {
        const data = asRecord<SubscriptionData>(await res.json(), { 
          tier: 'free', 
          status: 'active',
          tier_name: 'Standard Tier'
        });
        if (mountedRef.current) setSubscription(data);
      } else {
        if (mountedRef.current) setSubscription({ tier: 'free', status: 'active', tier_name: 'Standard Tier' });
      }
    } catch (err) {
      logger.debug('[useSubscription] Failed to fetch subscription', err);
      setError('Failed to load subscription data');
      if (mountedRef.current) setSubscription({ tier: 'free', status: 'active', tier_name: 'Standard Tier' });
    } finally {
      if (!silent && mountedRef.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    mountedRef.current = true;
    fetchSubscription();
    return () => { mountedRef.current = false; };
  }, [fetchSubscription]);

  // Real-time updates via Supabase
  useEffect(() => {
    if (!userId || userId === 'guest') return;

    const channel = supabase
      .channel(`user_subscription:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_subscriptions',
          filter: `user_id=eq.${userId}`,
        },
        () => fetchSubscription(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchSubscription]);

  return { subscription, loading, error, refetch: fetchSubscription };
};
