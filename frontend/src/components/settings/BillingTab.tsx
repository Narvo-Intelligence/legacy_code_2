import { motion } from 'framer-motion';
import { CreditCard } from '@phosphor-icons/react/CreditCard';
import { Receipt } from '@phosphor-icons/react/Receipt';
import { Crown } from '@phosphor-icons/react/Crown';
import { CheckCircle } from '@phosphor-icons/react/CheckCircle';
import { ArrowRight } from '@phosphor-icons/react/ArrowRight';
import { Sparkle } from '@phosphor-icons/react/Sparkle';
import { PlusCircle } from '@phosphor-icons/react/PlusCircle';
import { CircleNotch } from '@phosphor-icons/react/CircleNotch';

import { TFunction } from 'i18next';
import { SubscriptionData } from '../../hooks/useSubscription';

interface BillingTabProps {
  subscription: SubscriptionData | null;
  loading: boolean;
  actioning: 'upgrade' | 'downgrade' | 'cancel' | 'revert' | null;
  handleSetTier: (tier: string) => Promise<void>;
  handleCancel: () => Promise<void>;
  t: TFunction;
}

const BillingTab = ({ subscription, loading, actioning, handleSetTier, handleCancel }: BillingTabProps) => {

  const isPro = subscription?.tier === 'pro';
  const isCancelled = subscription?.status === 'cancelled';
  const busy = actioning !== null;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="glass-panel animate-pulse" style={{ height: 160, borderRadius: 24, background: 'rgba(15,95,115,0.05)' }}></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <div className="glass-panel animate-pulse" style={{ height: 120, borderRadius: 20, background: 'rgba(15,95,115,0.03)' }}></div>
          <div className="glass-panel animate-pulse" style={{ height: 120, borderRadius: 20, background: 'rgba(15,95,115,0.03)' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      
      {/* Active Subscription Card */}
      <section>
        <div className="glass-panel" style={{ 
          padding: 32, borderRadius: 24, position: 'relative', overflow: 'hidden',
          background: isPro ? 'linear-gradient(135deg, rgba(15,95,115,0.1) 0%, rgba(220,95,80,0.05) 100%)' : 'rgba(15,95,115,0.03)',
          border: isPro ? '1px solid rgba(15,95,115,0.2)' : '1px solid rgba(15,95,115,0.1)'
        }}>
          {isPro && (
            <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.05 }}>
              <Crown weight="fill" style={{ width: 140, height: 140, color: 'var(--color-primary)' }} />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--color-primary)', opacity: 0.6, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                Current Plan
              </p>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 32, color: 'var(--color-primary)', margin: 0 }}>
                {subscription?.tier_name || 'Standard Tier'}
              </h2>
            </div>
            <div style={{ 
              padding: '6px 12px', borderRadius: 20, background: isPro ? 'var(--color-primary)' : 'rgba(15,95,115,0.1)',
              color: isPro ? 'white' : 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 6
            }}>
              {isPro ? <CheckCircle weight="fill" size={14} /> : <CircleNotch size={14} />}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                {subscription?.status || 'Active'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'rgba(255,255,255,0.4)', borderRadius: 12, border: '1px solid rgba(15,95,115,0.05)' }}>
              <Sparkle weight="fill" size={16} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500 }}>Unlimited Playback</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'rgba(255,255,255,0.4)', borderRadius: 12, border: '1px solid rgba(15,95,115,0.05)' }}>
              <Receipt weight="fill" size={16} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500 }}>Next billing: {subscription?.next_billing_date || 'N/A'}</span>
            </div>
          </div>

          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!isPro ? (
              <motion.button
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                disabled={busy}
                onClick={() => handleSetTier('pro')}
                style={{ 
                  width: '100%', padding: '16px', borderRadius: 12, 
                  background: 'var(--color-primary)', color: 'white', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                  fontFamily: 'var(--font-body)', fontWeight: 700, cursor: 'pointer',
                  opacity: busy ? 0.7 : 1
                }}
              >
                {actioning === 'upgrade' ? (
                  <CircleNotch weight="bold" size={18} className="animate-spin" />
                ) : (
                  <>
                    Upgrade to Pro
                    <ArrowRight weight="bold" size={18} />
                  </>
                )}
              </motion.button>
            ) : (
              <div style={{ display: 'flex', gap: 12 }}>
                <motion.button
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  disabled={busy}
                  onClick={() => handleSetTier('free')}
                  style={{ 
                    flex: 1, padding: '12px', borderRadius: 12, 
                    background: 'rgba(15,95,115,0.06)', color: 'var(--color-primary)', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    fontFamily: 'var(--font-body)', fontWeight: 600, cursor: 'pointer',
                    fontSize: 13, opacity: busy ? 0.7 : 1
                  }}
                >
                  {actioning === 'revert' ? (
                    <CircleNotch weight="bold" size={16} className="animate-spin" />
                  ) : (
                    'Downgrade to Standard'
                  )}
                </motion.button>
                
                {!isCancelled && (
                  <motion.button
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    disabled={busy}
                    onClick={handleCancel}
                    style={{ 
                      padding: '12px 20px', borderRadius: 12, 
                      background: 'rgba(220,95,80,0.06)', color: '#dc5f50', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      fontFamily: 'var(--font-body)', fontWeight: 600, cursor: 'pointer',
                      fontSize: 13, opacity: busy ? 0.7 : 1
                    }}
                  >
                    {actioning === 'cancel' ? (
                      <CircleNotch weight="bold" size={16} className="animate-spin" />
                    ) : (
                      'Cancel Plan'
                    )}
                  </motion.button>
                )}
              </div>
            )}
            
            {isCancelled && (
              <p style={{ 
                fontFamily: 'var(--font-mono)', fontSize: 10, color: '#dc5f50', 
                textAlign: 'center', marginTop: 8, fontWeight: 600, textTransform: 'uppercase' 
              }}>
                Plan scheduled for cancellation
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Payment & History Split */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        
        {/* Payment Method */}
        <section className="glass-panel" style={{ padding: 24, borderRadius: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <CreditCard weight="bold" style={{ width: 20, height: 20, color: 'var(--color-primary)' }} />
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--color-primary)', margin: 0 }}>Payment Method</h3>
          </div>
          <div style={{ padding: 16, background: 'rgba(15,95,115,0.03)', borderRadius: 12, border: '1px solid rgba(15,95,115,0.05)', display: 'flex', alignItems: 'center', gap: 16 }}>
             <div style={{ width: 44, height: 28, background: 'var(--color-primary)', borderRadius: 4, opacity: 0.8 }} />
             <div>
               <p style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500, margin: 0 }}>•••• •••• •••• 4242</p>
               <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--color-text-mid)', margin: 0 }}>Expires 12/28</p>
             </div>
          </div>
          <button style={{ 
            marginTop: 16, background: 'none', border: 'none', color: 'var(--color-primary)', 
            fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, 
            display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: 0
          }}>
            <PlusCircle size={14} /> Update Payment Method
          </button>
        </section>

        {/* Invoices */}
        <section className="glass-panel" style={{ padding: 24, borderRadius: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <Receipt weight="bold" style={{ width: 20, height: 20, color: 'var(--color-primary)' }} />
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--color-primary)', margin: 0 }}>Recent Invoices</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2].map(i => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(15,95,115,0.05)' }}>
                <div>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, margin: 0 }}>Narvo Pro Monthly</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-mid)', margin: 0 }}>Mar {20-i}, 2026</p>
                </div>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--color-primary)' }}>$20.00</span>
              </div>
            ))}
          </div>
          <button style={{ 
            marginTop: 16, background: 'none', border: 'none', color: 'var(--color-primary)', 
            fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0
          }}>
            View All Invoices
          </button>
        </section>

      </div>

    </div>
  );
};

export default BillingTab;
