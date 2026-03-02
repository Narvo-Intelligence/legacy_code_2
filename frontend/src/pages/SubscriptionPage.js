import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useHapticAlert } from '../components/HapticAlerts';
import BackToSettings from '../components/BackToSettings';
import { Broadcast, CircleNotch, Check, CaretRight, FileText } from '@phosphor-icons/react';
import * as api from '../lib/api';
import { supabase } from '../lib/supabase';

const TIERS = [
  { id: 'free', order: 0 },
  { id: 'pro', order: 1 },
  { id: 'enterprise', order: 2 },
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

  if (loading) {
    return (
      <main className="flex-1 flex flex-col min-h-0 bg-[rgb(var(--color-bg))] overflow-hidden" data-testid="subscription-page">
        <div className="shrink-0 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]/10">
          <BackToSettings />
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="flex items-center gap-3 font-mono text-[12px] text-[rgb(var(--color-text-secondary))]">
            <CircleNotch weight="bold" className="w-5 h-5 animate-spin text-[rgb(var(--color-primary))]" />
            {t('settings.loading')}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col min-h-0 bg-[rgb(var(--color-bg))] overflow-hidden" data-testid="subscription-page">
      <div className="shrink-0 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]/10">
        <div className="p-4 flex items-center justify-between">
          <BackToSettings />
          <span className="font-mono text-[10px] md:text-[11px] text-[rgb(var(--color-text-secondary))] font-bold tracking-[0.2em] uppercase">
            {t('settings.subscription_tagline')}
          </span>
        </div>
        <div className="px-4 pb-4">
          <h1 className="font-display text-xl md:text-2xl font-bold text-[rgb(var(--color-text-primary))] uppercase tracking-tight">
            {t('settings.subscription_module')}
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll p-4 md:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
          {/* Current plan banner */}
          <section className="narvo-border relative overflow-hidden bg-[rgb(var(--color-surface))]/20">
            <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none">
              <Broadcast className="w-40 h-40 md:w-52 md:h-52 text-[rgb(var(--color-primary))]" />
            </div>
            <div className="relative z-10 p-4 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 bg-[rgb(var(--color-primary))] animate-pulse" />
                <div>
                  <p className="font-mono text-[10px] md:text-[11px] text-[rgb(var(--color-text-secondary))] font-bold uppercase tracking-widest">
                    {t('settings.current_plan')}
                  </p>
                  <p className="font-display text-2xl md:text-3xl font-bold text-[rgb(var(--color-text-primary))] uppercase tracking-tight">
                    {tierLabel(currentTier)}
                  </p>
                  {isCancelled && (
                    <span className="inline-block mt-1 font-mono text-[10px] font-bold px-1.5 py-0.5 border border-[rgb(var(--color-text-dim))] text-[rgb(var(--color-text-dim))]">
                      {t('settings.plan_cancelled')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => window.location.href = '#'}
                  className="min-h-[48px] px-4 py-2 font-mono text-[11px] md:text-[12px] font-bold border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] hover:border-[rgb(var(--color-primary))] hover:text-[rgb(var(--color-primary))] transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--color-primary))] focus-visible:outline-offset-2 flex items-center gap-2"
                  data-testid="view-invoices-btn"
                >
                  <FileText weight="bold" className="w-4 h-4" />
                  {t('settings.view_invoices')}
                </button>
              </div>
            </div>
          </section>

          {/* Tier cards */}
          <section>
            <h2 className="font-mono text-[11px] md:text-[12px] text-[rgb(var(--color-text-secondary))] font-bold tracking-[0.2em] mb-4 uppercase">
              {t('settings.change_plan')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {TIERS.map(({ id }) => {
                const isActive = currentTier === id;
                const isHigher = (id === 'pro' && currentTier === 'free') || (id === 'enterprise' && currentTier !== 'enterprise');
                const isLower = id === 'free' && currentTier !== 'free';
                const canUpgrade = isHigher;
                const canDowngrade = isLower;
                const busy = actioning !== null;

                return (
                  <div
                    key={id}
                    className={`relative narvo-border p-4 md:p-6 flex flex-col transition-all ${
                      isActive
                        ? 'bg-[rgb(var(--color-primary))]/10 border-[rgb(var(--color-primary))]'
                        : 'bg-[rgb(var(--color-surface))]/10 hover:border-[rgb(var(--color-text-secondary))]/50'
                    }`}
                    data-testid={`tier-card-${id}`}
                  >
                    {isActive && (
                      <span className="absolute top-3 right-3 font-mono text-[9px] font-bold px-1.5 py-0.5 bg-[rgb(var(--color-primary))] text-[rgb(var(--color-bg))] flex items-center gap-1">
                        <Check weight="bold" className="w-3 h-3" />
                        {t('settings.plan_active')}
                      </span>
                    )}
                    <div>
                      <h3 className="font-display text-lg md:text-xl font-bold text-[rgb(var(--color-text-primary))] uppercase tracking-tight pr-20">
                        {tierLabel(id)}
                      </h3>
                      <p className="font-mono text-[10px] md:text-[11px] text-[rgb(var(--color-text-secondary))] mt-2 leading-relaxed">
                        {tierDesc(id)}
                      </p>
                    </div>
                    <div className="mt-6 flex flex-col gap-2">
                      {canUpgrade && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleSetTier(id)}
                          className="min-h-[48px] w-full font-mono text-[11px] md:text-[12px] font-bold border border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]/10 text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-primary))] hover:text-[rgb(var(--color-bg))] transition-colors flex items-center justify-center gap-2 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--color-primary))] focus-visible:outline-offset-2 disabled:opacity-50"
                          data-testid={`upgrade-${id}`}
                        >
                          {actioning === 'upgrade' || actioning === 'downgrade' ? (
                            <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              {t('settings.upgrade')}
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
                            className="min-h-[48px] w-full font-mono text-[11px] md:text-[12px] font-bold border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] hover:border-[rgb(var(--color-primary))] hover:text-[rgb(var(--color-primary))] transition-colors flex items-center justify-center gap-2 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--color-primary))] focus-visible:outline-offset-2 disabled:opacity-50"
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
                              className="min-h-[48px] w-full font-mono text-[11px] md:text-[12px] font-bold border border-[rgb(var(--color-text-dim))] text-[rgb(var(--color-text-dim))] hover:border-red-500/50 hover:text-red-400 transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 focus-visible:outline-offset-2 disabled:opacity-50"
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
                      {id === currentTier && !canDowngrade && !canUpgrade && (
                        <p className="font-mono text-[10px] text-[rgb(var(--color-text-secondary))]">
                          {id === 'free' ? t('settings.tier_free_desc') : t('settings.plan_active')}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default SubscriptionPage;
