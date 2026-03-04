import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useHapticAlert } from '../components/HapticAlerts';
import BackToSettings from '../components/BackToSettings';
import { CircleNotch, Check, CaretRight } from '@phosphor-icons/react';
import * as api from '../lib/api';
import { supabase } from '../lib/supabase';

const TIERS = [
  { id: 'free', order: 0, featuresKey: 'tier_free_features' },
  { id: 'pro', order: 1, featuresKey: 'tier_pro_proposed' },
  { id: 'enterprise', order: 2, featuresKey: 'tier_enterprise_proposed' },
];

const SubscriptionPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showAlert } = useHapticAlert();
  const userId = user?.id || 'guest';

  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(null); // 'upgrade' | 'downgrade' | 'cancel' | 'revert'

  const fetchSubscription = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get(`api/subscription/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
      } else {
        setSubscription({ tier: 'free', status: 'active' });
      }
    } catch {
      setSubscription({ tier: 'free', status: 'active' });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Refetch when window regains focus (e.g. after another tab or backend change)
  useEffect(() => {
    const onFocus = () => fetchSubscription(true);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchSubscription]);

  // Supabase Realtime: subscribe to user_subscriptions for this user (requires table in supabase_realtime publication)
  const channelRef = useRef(null);
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
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId, fetchSubscription]);

  const currentTier = subscription?.tier || 'free';
  const isCancelled = subscription?.status === 'cancelled';

  const handleSetTier = async (newTier) => {
    if (newTier === currentTier) return;
    const key = newTier === 'free' ? 'revert' : currentTier === 'free' ? 'upgrade' : 'downgrade';
    setActioning(key);
    try {
      if (newTier === 'free') {
        const res = await api.del(`api/subscription/${userId}`);
        if (res.ok) {
          setSubscription({ tier: 'free', status: 'active' });
          showAlert({ type: 'sync', title: 'UPDATED', message: t('settings.updated'), code: 'SUB_OK', duration: 2000 });
        }
      } else {
        const res = await api.put(`api/subscription/${userId}`, { tier: newTier, status: 'active' });
        if (res.ok) {
          const data = await res.json();
          setSubscription(data);
          showAlert({ type: 'sync', title: 'UPDATED', message: t('settings.updated'), code: 'SUB_OK', duration: 2000 });
        }
      }
    } catch {
      showAlert({ type: 'error', title: 'ERROR', message: t('settings.error_load'), code: 'SUB_ERR' });
    } finally {
      setActioning(null);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm(t('settings.confirm_cancel'))) return;
    setActioning('cancel');
    try {
      const res = await api.post(`api/subscription/${userId}/cancel`, {});
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
        showAlert({ type: 'sync', title: 'CANCELLED', message: t('settings.cancelled'), code: 'SUB_CANCEL', duration: 2000 });
      }
    } catch {
      showAlert({ type: 'error', title: 'ERROR', message: t('settings.error_load'), code: 'SUB_ERR' });
    } finally {
      setActioning(null);
    }
  };

  const tierLabel = (id) => {
    switch (id) {
      case 'free': return t('settings.tier_free');
      case 'pro': return t('settings.tier_pro');
      case 'enterprise': return t('settings.tier_enterprise');
      default: return id;
    }
  };

  const tierDesc = (id) => {
    switch (id) {
      case 'free': return t('settings.tier_free_desc');
      case 'pro': return t('settings.tier_pro_desc');
      case 'enterprise': return t('settings.tier_enterprise_desc');
      default: return '';
    }
  };

  const tierFeatures = (id) => {
    switch (id) {
      case 'free': return t('settings.tier_free_features', 'Current features: feed, bookmarks, TTS, briefings');
      case 'pro': return t('settings.tier_pro_proposed', 'Proposed: 50–100 story fetch, 3 briefings/day, higher TTS quota');
      case 'enterprise': return t('settings.tier_enterprise_proposed', 'Proposed: SSO, SLA, org admin, verification and TTS API');
      default: return '';
    }
  };

  if (loading) {
    return (
      <main className="flex-1 flex flex-col min-h-0 bg-background-dark overflow-hidden" data-testid="subscription-page">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex items-center gap-3 mono-ui text-[12px] text-forest">
            <CircleNotch weight="bold" className="w-5 h-5 animate-spin text-primary" />
            {t('settings.loading')}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col min-h-0 bg-background-dark overflow-hidden p-4 md:p-6" data-testid="subscription-page">
      <div className="flex-1 overflow-y-auto custom-scroll">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-4 md:gap-6">
          {/* Back row + tagline (reference: single line with back left, label right) */}
          <div className="flex w-full items-center justify-between gap-4 font-mono text-[12px] text-content-secondary">
            <BackToSettings />
            <span className="hidden sm:inline text-primary">BROADCAST_TIER_MANAGEMENT</span>
          </div>

          <h1 className="font-display text-[32px] md:text-[40px] font-bold text-content uppercase tracking-tight">
            {t('settings.subscription_module', 'SUBSCRIPTION')}
          </h1>

          {/* Current plan box (reference: h-[88px], border, bg-surface, CURRENT_PLAN + FREE left, VIEW_INVOICES right) */}
          <div className="flex min-h-[88px] w-full items-center justify-between gap-4 border border-forest bg-surface px-4 py-3 md:px-5">
            <div className="flex flex-col gap-0.5">
              <div className="font-mono text-[14px] leading-[1.6] text-content whitespace-pre-line">
                {`${t('settings.current_plan', 'CURRENT_PLAN')}\n${tierLabel(currentTier).toUpperCase()}`}
              </div>
              {isCancelled && (
                <span className="font-mono text-[10px] font-bold text-content-dim-accessible">
                  {t('settings.plan_cancelled')}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => window.location.href = '#'}
              className="h-[48px] w-[180px] shrink-0 border border-forest font-mono text-[12px] text-primary hover:bg-surface transition-colors flex items-center justify-center focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
              data-testid="view-invoices-btn"
            >
              [ {t('settings.view_invoices', 'VIEW_INVOICES')} ]
            </button>
          </div>

          {/* CHANGE_PLAN label */}
          <div className="font-mono text-[12px] text-content-secondary">
            {t('settings.change_plan', 'CHANGE_PLAN')}
          </div>

          {/* Three tier cards (reference: flex gap-4, article flex-1, border surface, p-3, title 28px, body 13px/12px) */}
          <div className="flex flex-col md:flex-row w-full gap-4">
            {TIERS.map(({ id }) => {
              const isActive = currentTier === id;
              const isHigher = (id === 'pro' && currentTier === 'free') || (id === 'enterprise' && currentTier !== 'enterprise');
              const isLower = id === 'free' && currentTier !== 'free';
              const canUpgrade = isHigher;
              const canDowngrade = isLower;
              const busy = actioning !== null;

              return (
                <article
                  key={id}
                  className="flex flex-1 flex-col gap-3 border border-forest bg-surface p-3 md:p-4"
                  data-testid={`tier-card-${id}`}
                >
                  <h2 className="font-display text-[24px] md:text-[28px] font-bold text-content uppercase tracking-tight">
                    {tierLabel(id).toUpperCase()}
                  </h2>
                  <p className="font-body text-[13px] leading-[1.5] text-content-secondary">
                    {tierDesc(id)}
                  </p>
                  <p className="font-body text-[12px] leading-[1.5] text-content-dim-accessible">
                    {tierFeatures(id)}
                  </p>
                  <div className="mt-auto flex flex-col gap-2 pt-2">
                    {isActive && (
                      <span
                        className="h-[48px] w-full border border-primary bg-primary font-mono text-[13px] font-bold text-background-dark flex items-center justify-center gap-1.5"
                        aria-label={t('settings.plan_active')}
                      >
                        <Check weight="bold" className="w-4 h-4" />
                        {t('settings.plan_active', 'ACTIVE')}
                      </span>
                    )}
                    {canUpgrade && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleSetTier(id)}
                        className="h-[48px] w-full border border-primary font-mono text-[13px] text-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-2 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 disabled:opacity-50"
                        data-testid={`upgrade-${id}`}
                      >
                        {actioning === 'upgrade' || actioning === 'downgrade' ? (
                          <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            {t('settings.upgrade', 'UPGRADE')}
                            <CaretRight weight="bold" className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    )}
                    {canDowngrade && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => window.confirm(t('settings.confirm_downgrade')) && handleSetTier('free')}
                          className="h-[48px] w-full border border-forest font-mono text-[13px] text-content hover:border-primary hover:text-primary transition-colors flex items-center justify-center focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 disabled:opacity-50"
                          data-testid="downgrade-free"
                        >
                          {actioning === 'revert' ? (
                            <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
                          ) : (
                            t('settings.downgrade')
                          )}
                        </button>
                        {!isCancelled && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={handleCancel}
                            className="h-[48px] w-full border border-forest/50 font-mono text-[13px] text-content-dim-accessible hover:border-red-500/50 hover:text-red-400 transition-colors flex items-center justify-center focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 focus-visible:outline-offset-2 disabled:opacity-50"
                            data-testid="cancel-subscription-btn"
                          >
                            {actioning === 'cancel' ? (
                              <CircleNotch weight="bold" className="w-4 h-4 animate-spin mx-auto" />
                            ) : (
                              t('settings.cancel_plan')
                            )}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
};

export default SubscriptionPage;
