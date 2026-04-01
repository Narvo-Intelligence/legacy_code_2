import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  UserCircle, 
  MicrophoneStage, 
  CreditCard, 
  SlidersHorizontal, 
  Wheelchair,
  CaretLeft
} from '@phosphor-icons/react';

// Contexts & Hooks
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import useSWR from 'swr';
import * as api from '../lib/api';

// Sub-components
import AccountTab from '../components/settings/AccountTab';
import VoiceTab from '../components/settings/VoiceTab';
import BillingTab from '../components/settings/BillingTab';
import PreferencesTab from '../components/settings/PreferencesTab';
import AccessibilityTab from '../components/settings/AccessibilityTab';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'account';

  // Audio & Subscription Contexts
  const { subscription, loading: subLoading } = useSubscription(user?.id);

  // ── Data Fetching ──────────────────────────────────────────────────────

  // User Preferences Fetching
  const { 
    data: preferences, 
    mutate: mutatePrefs, 
    isValidating: prefLoading 
  } = useSWR(
    user ? 'api/me/preferences' : null,
    async (path: string) => {
      const res = await api.get(path);
      if (!res.ok) throw new Error(`Preferences fetch failed (${res.status})`);
      return res.json();
    }
  );

  // User Settings Fetching
  const { 
    data: settings, 
    mutate: mutateSettings, 
    isValidating: settingsLoading 
  } = useSWR(
    user ? 'api/me/settings' : null,
    async (path: string) => {
      const res = await api.get(path);
      if (!res.ok) throw new Error(`Settings fetch failed (${res.status})`);
      return res.json();
    }
  );

  // Save Status
  const [prefSaveStatus, setPrefSaveStatus] = useState<'saving' | 'saved' | null>(null);
  const [settingsSaveStatus, setSettingsSaveStatus] = useState<'saving' | 'saved' | null>(null);
  const prefSaveTimeoutRef = useRef<number | null>(null);
  const settingsSaveTimeoutRef = useRef<number | null>(null);
  const [actioning, setActioning] = useState<'upgrade' | 'downgrade' | 'cancel' | 'revert' | null>(null);

  useEffect(() => {
    return () => {
      if (prefSaveTimeoutRef.current) window.clearTimeout(prefSaveTimeoutRef.current);
      if (settingsSaveTimeoutRef.current) window.clearTimeout(settingsSaveTimeoutRef.current);
    };
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleSetTier = async (newTier: string) => {
    if (!user || !subscription) return;
    const currentTier = subscription.tier || 'free';
    if (newTier === currentTier) return;
    
    const actionKey = newTier === 'free' ? 'revert' : (newTier === 'pro' ? 'upgrade' : 'downgrade');
    setActioning(actionKey);
    
    try {
      if (newTier === 'free') {
        await api.del(`api/subscription/${user.id}`);
      } else {
        await api.put(`api/subscription/${user.id}`, { tier: newTier, status: 'active' });
      }
      // Re-fetch via SWR would be better, but we'll use a local update or wait for SWR
      // For now, let's assume SWR will re-fetch on focus or we can manually mutate
      window.location.reload(); // Simple way to ensure consistency for now, or use mutate
    } catch (err) {
      console.error('Failed to update subscription:', err);
    } finally {
      setActioning(null);
    }
  };

  const handleCancel = async () => {
    if (!user || !subscription) return;
    if (!window.confirm(t('settings.confirm_cancel'))) return;
    
    setActioning('cancel');
    try {
      await api.post(`api/subscription/${user.id}/cancel`, {});
      window.location.reload();
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
    } finally {
      setActioning(null);
    }
  };

  const handlePreferenceChange = async (key: string, value: any) => {
    if (!user || !preferences) return;
    setPrefSaveStatus('saving');
    if (prefSaveTimeoutRef.current) window.clearTimeout(prefSaveTimeoutRef.current);
    const updated = { ...preferences, [key]: value };
    
    // Filter out extra keys to avoid 422 errors (strict backend validation)
    const validKeys = ['voice_id', 'voice', 'playback_speed', 'categories', 'notifications_enabled', 'region', 'interests'];
    const payload = Object.keys(updated)
      .filter(k => validKeys.includes(k))
      .reduce((obj, k) => ({ ...obj, [k]: updated[k] }), {});

    try {
      await api.post('api/me/preferences', payload);
      mutatePrefs(updated, false);
      setPrefSaveStatus('saved');
      prefSaveTimeoutRef.current = window.setTimeout(() => setPrefSaveStatus(null), 2000);
    } catch (err) {
      console.error('Failed to save preference:', err);
      setPrefSaveStatus(null);
    }
  };

  const handleSettingChange = async (key: string, value: any) => {
    if (!user || !settings) return;
    setSettingsSaveStatus('saving');
    if (settingsSaveTimeoutRef.current) window.clearTimeout(settingsSaveTimeoutRef.current);
    const updated = { ...settings, [key]: value };
    
    try {
      await api.post('api/me/settings', updated);
      mutateSettings(updated, false);
      setSettingsSaveStatus('saved');
      settingsSaveTimeoutRef.current = window.setTimeout(() => setSettingsSaveStatus(null), 2000);
    } catch (err) {
      console.error('Failed to save setting:', err);
      setSettingsSaveStatus(null);
    }
  };

  const tabs = [
    { id: 'account', label: t('settings.account', 'Account'), icon: UserCircle },
    { id: 'voice', label: t('settings.voice', 'Voice Studio'), icon: MicrophoneStage },
    { id: 'billing', label: t('settings.billing', 'Subscription'), icon: CreditCard },
    { id: 'prefs', label: t('settings.prefs', 'Preferences'), icon: SlidersHorizontal },
    { id: 'a11y', label: t('settings.a11y', 'Accessibility'), icon: Wheelchair },
  ];

  const handleTabChange = (id: string) => {
    setSearchParams({ tab: id });
  };

  const renderContent = () => {
    if (!preferences || !settings) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
            <SlidersHorizontal size={32} color="var(--color-primary)" opacity={0.5} />
          </motion.div>
        </div>
      );
    }

    switch (activeTab) {
      case 'account':
        return <AccountTab />;
      case 'voice':
        return <VoiceTab t={t} />;
      case 'billing':
        return <BillingTab subscription={subscription} loading={subLoading} actioning={actioning} handleSetTier={handleSetTier} handleCancel={handleCancel} t={t} />;
      case 'prefs':
        return (
          <PreferencesTab 
            theme={settings.theme || 'dark'} 
            setTheme={(v) => handleSettingChange('theme', v)}
            language={settings.interface_language || 'en'} 
            setLanguage={(v) => handleSettingChange('interface_language', v)}
            notifications={{ 
              breaking: preferences.notifications_enabled, 
              digest: settings.notifications_digest ?? false,
              mentions: settings.notifications_mentions ?? false,
            }} 
            setNotifications={(v: any) => {
              handlePreferenceChange('notifications_enabled', v.breaking);
              handleSettingChange('notifications_digest', v.digest);
              handleSettingChange('notifications_mentions', v.mentions);
            }}
            interests={preferences.interests || []} 
            setInterests={(v) => handlePreferenceChange('interests', v)}
            soundTheme={settings.sound_theme || 'Sonic'} 
            setSoundTheme={(v) => handleSettingChange('sound_theme', v)}
            alertVolume={settings.alert_volume || 80} 
            setAlertVolume={(v) => handleSettingChange('alert_volume', v)}
            aggregators={{ 
              google: settings.aggregator_mediastack, 
              bing: settings.aggregator_newsdata, 
              apple: true 
            }} 
            setAggregators={(v: any) => handleSettingChange('aggregator_mediastack', v.google)}
            prefLoading={prefLoading || settingsLoading} 
            prefSaveStatus={prefSaveStatus} 
            t={t}
          />
        );
      case 'a11y':
        return (
          <AccessibilityTab 
            density={settings.display_density || 'standard'} 
            setDensity={(v) => handleSettingChange('display_density', v)}
            fontScale={settings.font_scale || 100} 
            setFontScale={(v) => handleSettingChange('font_scale', v)}
            gestures={{ lateralSwipe: settings.gestural_swipe, pinchZoom: settings.gestural_pinch }} 
            setGestures={(v: any) => {
              handleSettingChange('gestural_swipe', v.lateralSwipe);
              handleSettingChange('gestural_pinch', v.pinchZoom);
            }}
            voiceCmd={settings.voice_commands || false} 
            setVoiceCmd={(v) => handleSettingChange('voice_commands', v)}
            highContrast={settings.high_contrast || false} 
            setHighContrast={(v) => handleSettingChange('high_contrast', v)}
            a11yLoading={settingsLoading} 
            a11ySaveStatus={settingsSaveStatus} 
            t={t}
          />
        );
      default:
        return <AccountTab />;
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', background: 'var(--color-bg-main)', 
      color: 'var(--color-text-main)', paddingBottom: 100 
    }}>
      {/* Header */}
      <header style={{ 
        position: 'sticky', top: 0, zIndex: 100, 
        background: 'rgba(239, 246, 247, 0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(15,95,115,0.1)', padding: '16px 20px'
      }}>
        <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <button 
            onClick={() => navigate(-1)}
            style={{ 
              width: 40, height: 40, borderRadius: '50%', background: 'white', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer',
              color: 'var(--color-primary)', boxShadow: '0 2px 8px rgba(15,95,115,0.08)'
            }}
          >
            <CaretLeft weight="bold" size={20} />
          </button>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>
              {t('settings.hub_title', 'Configuration')}
            </h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-text-mid)', fontWeight: 500 }}>
              Narvo v5.1 Intelligence Node
            </p>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 700, margin: '24px auto', padding: '0 16px' }}>
        {/* Tab Navigation */}
        <div style={{ 
          display: 'flex', overflowX: 'auto', gap: 8, paddingBottom: 12, 
          marginBottom: 32, msOverflowStyle: 'none', scrollbarWidth: 'none' 
        }} className="no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px',
                  borderRadius: 24, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                  background: isActive ? 'var(--color-primary)' : 'rgba(15,95,115,0.06)',
                  color: isActive ? 'white' : 'var(--color-primary)',
                  fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14,
                  transition: 'all 240ms cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isActive ? '0 10px 20px -5px rgba(15,95,115,0.3)' : 'none'
                }}
              >
                <Icon weight={isActive ? "fill" : "bold"} size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default SettingsPage;
