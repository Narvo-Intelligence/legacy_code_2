import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useHapticAlert } from '../components/HapticAlerts';
import { useSettings } from '../hooks/useSettings';
import { SignOut, User, Microphone, Monitor, Wheelchair, CaretRight, ShieldCheck, Lightning, Database, Clock, Bell, Globe, Sun, Moon, Tree, Compass, GridFour } from '@phosphor-icons/react';
import { LANGUAGES } from '../i18n';
import { NotificationToggle } from '../components/BreakingNews';
import DailyDigest from '../components/features/DailyDigest';
import { openTourGuide, resetTourGuide } from '../components/TourGuideModal';
import * as api from '../lib/api';

const INTEREST_CATEGORIES = [
  { id: 'politics', label: 'POLITICS', desc: 'Government, elections, policy' },
  { id: 'economy', label: 'ECONOMY', desc: 'Markets, trade, finance' },
  { id: 'tech', label: 'TECH', desc: 'Innovation, startups, digital' },
  { id: 'sports', label: 'SPORTS', desc: 'Football, athletics, leagues' },
  { id: 'health', label: 'HEALTH', desc: 'Medical, wellness, disease' },
  { id: 'general', label: 'GENERAL', desc: 'Broad coverage, breaking news' },
  { id: 'culture', label: 'CULTURE', desc: 'Arts, music, Nollywood' },
  { id: 'security', label: 'SECURITY', desc: 'Defense, conflict, peace' },
];

const SettingsPage = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showAlert } = useHapticAlert();

  const { updateSetting } = useSettings(
    { interface_language: 'en', theme: 'nature' },
    (api) => ({ interface_language: api.interface_language || 'en', theme: api.theme || 'nature' }),
    (local) => ({ interface_language: local.interface_language, theme: local.theme })
  );

  const [interests, setInterests] = React.useState([]);
  const [interestsSaving, setInterestsSaving] = React.useState(false);

  React.useEffect(() => {
    const userId = user?.id || 'guest';
    api.get(`api/settings/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.interests?.length) setInterests(data.interests);
      })
      .catch(() => {});
  }, [user?.id]);

  const toggleInterest = useCallback((catId) => {
    const next = interests.includes(catId)
      ? interests.filter(i => i !== catId)
      : [...interests, catId];
    setInterests(next);
    setInterestsSaving(true);
    const userId = user?.id || 'guest';
    // Save to both localStorage and MongoDB
    try {
      const existing = JSON.parse(localStorage.getItem('narvo_settings_cache') || '{}');
      localStorage.setItem('narvo_settings_cache', JSON.stringify({ ...existing, interests: next }));
    } catch { /* ignore */ }
    api.post(`api/settings/${userId}`, { interests: next }).then(() => {
      showAlert({ type: 'sync', title: 'INTERESTS_UPDATED', message: `${next.length} categories selected`, code: 'INT_OK', duration: 2000 });
    }).catch(() => {}).finally(() => setInterestsSaving(false));
  }, [interests, user?.id, showAlert]);

  const handleLanguageChange = useCallback((code) => {
    i18n.changeLanguage(code);
    updateSetting('interface_language', code);
    showAlert({ type: 'sync', title: 'LANGUAGE_CHANGED', message: `Interface set to ${code.toUpperCase()}`, code: 'LANG_OK', duration: 3000 });
  }, [i18n, updateSetting, showAlert]);

  const handleThemeToggle = useCallback(() => {
    const next = theme === 'nature' ? 'sun' : theme === 'sun' ? 'moon' : 'nature';
    toggleTheme();
    updateSetting('theme', next);
  }, [toggleTheme, theme, updateSetting]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {}
    localStorage.removeItem('narvo_user');
    localStorage.removeItem('narvo_preferences');
    navigate('/');
  };

  const settingsSections = [
    {
      title: t('settings.profile_management'),
      items: [
        { 
          icon: User, 
          label: t('settings.account'), 
          desc: 'SUBSCRIPTION_PLAN // METRICS // REGION', 
          path: '/account',
          status: 'PREMIUM_ACTIVE'
        },
        { 
          icon: Microphone, 
          label: t('settings.voice_studio'), 
          desc: 'BROADCAST_VOICE_MODEL // DIALECT_CONFIG', 
          path: '/voices',
          status: 'NOVA_SELECTED'
        },
      ]
    },
    {
      title: t('settings.system_configuration'),
      items: [
        { 
          icon: Monitor, 
          label: t('settings.system_settings'), 
          desc: 'DISPLAY // NOTIFICATIONS // THROUGHPUT', 
          path: '/system',
          status: 'CONFIGURED'
        },
        { 
          icon: Wheelchair, 
          label: t('settings.accessibility'), 
          desc: 'DENSITY // FONTS // GESTURES // VOICE_CMD', 
          path: '/accessibility',
          status: 'OPTIMIZED'
        },
      ]
    }
  ];

  const systemStats = [
    { icon: ShieldCheck, label: 'ENCRYPTION', value: 'AES-256-GCM' },
    { icon: Lightning, label: 'AUTH_PROVIDER', value: 'SUPABASE' },
    { icon: Database, label: 'STORAGE_USED', value: '2.4 GB' },
    { icon: Clock, label: 'SESSION_TIME', value: '04:32:18' },
  ];

  return (
    <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scroll bg-background-dark" data-testid="settings-page">
      {/* Header */}
      <div className="p-6 md:p-10 narvo-border-b">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-2 h-2 bg-primary animate-pulse" />
          <span className="mono-ui text-[11px] md:text-[12px] text-primary font-bold">CONTROL_CENTER_ACTIVE</span>
        </div>
        <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-content uppercase tracking-tight">
          {t('settings.title')}
        </h1>
        <p className="mono-ui text-[12px] md:text-[13px] text-forest mt-2">
          CONFIGURE_BROADCAST_PARAMETERS // MANAGE_SYSTEM_PROTOCOLS
        </p>
      </div>

      <div className="p-4 md:p-10 pb-32 md:pb-10">
        <div className="max-w-4xl mx-auto space-y-8 md:space-y-12">
          
          {/* User Profile Card */}
          {user && (
            <div className="narvo-border bg-surface/10 p-6 md:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl" />
              <div className="relative z-10">
                <span className="mono-ui text-[10px] md:text-[11px] text-forest font-bold tracking-[0.2em] block mb-4">
                  AUTHENTICATED_OPERATOR
                </span>
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="w-16 h-16 md:w-20 md:h-20 narvo-border bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="font-display text-primary text-2xl md:text-3xl font-bold">
                      {user.email?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-content block font-display font-bold text-lg md:text-xl truncate">
                      {user.email}
                    </span>
                    <span className="mono-ui text-[11px] md:text-[12px] text-forest block mt-1">
                      OPERATOR_ID: {user.id?.slice(0, 20)}...
                    </span>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 bg-primary/20 text-primary mono-ui text-[10px] font-bold">
                        PREMIUM
                      </span>
                      <span className="px-2 py-0.5 bg-forest/20 text-forest mono-ui text-[10px] font-bold">
                        VERIFIED
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Theme Toggle */}
          <div className="space-y-4">
            <h2 className="mono-ui text-[12px] md:text-[13px] text-forest font-bold tracking-[0.2em] border-b border-forest/30 pb-2">
              APPEARANCE_MODE
            </h2>
            <div className="narvo-border bg-surface/5 p-5 md:p-6">
              <div className="flex items-center gap-4 md:gap-6">
                <div className="w-10 h-10 md:w-12 md:h-12 narvo-border bg-background-dark flex items-center justify-center">
                  {theme === 'nature' && <Tree weight="fill" className="w-5 h-5 md:w-6 md:h-6 text-primary" />}
                  {theme === 'sun' && <Sun weight="fill" className="w-5 h-5 md:w-6 md:h-6 text-primary" />}
                  {theme === 'moon' && <Moon weight="fill" className="w-5 h-5 md:w-6 md:h-6 text-primary" />}
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-lg md:text-xl font-bold text-content uppercase">THEME_MODE</h3>
                  <p className="mono-ui text-[10px] md:text-[11px] text-forest">NATURE · SUN · MOON</p>
                </div>
                <button
                  onClick={handleThemeToggle}
                  className="flex items-center gap-3 px-4 py-3 narvo-border bg-surface/10 hover:bg-primary/10 hover:border-primary transition-all"
                  data-testid="settings-theme-toggle"
                >
                  <span className="mono-ui text-[12px] text-primary font-bold">
                    {theme === 'nature' ? 'NATURE' : theme === 'sun' ? 'SUN' : 'MOON'}
                  </span>
                  <div className="w-14 h-6 bg-background-dark narvo-border relative">
                    <div
                      className={`absolute top-1 w-4 h-4 bg-primary transition-all ${theme === 'nature' ? 'left-1' : theme === 'sun' ? 'left-5' : 'left-9'}`}
                    />
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Interface Language Selector */}
          <div className="space-y-4">
            <h2 className="mono-ui text-[12px] md:text-[13px] text-forest font-bold tracking-[0.2em] border-b border-forest/30 pb-2">
              INTERFACE_LANGUAGE
            </h2>
            <div className="narvo-border bg-surface/5 p-5 md:p-6">
              <div className="flex items-center gap-4 md:gap-6 mb-5">
                <div className="w-10 h-10 md:w-12 md:h-12 narvo-border bg-background-dark flex items-center justify-center">
                  <Globe className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-lg md:text-xl font-bold text-content uppercase">{t('settings.language')}</h3>
                  <p className="mono-ui text-[10px] md:text-[11px] text-forest">CONTROLS_UI_TEXT_AND_MENUS — NOT_AUDIO_BROADCAST</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`px-4 py-2 mono-ui text-[12px] font-bold transition-all ${
                      i18n.language === lang.code
                        ? 'bg-primary text-background-dark'
                        : 'narvo-border text-forest hover:text-content hover:border-forest'
                    }`}
                    data-testid={`interface-lang-${lang.code}`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
              <p className="mono-ui text-[9px] md:text-[10px] text-forest/50 mt-4">
                TO_CHANGE_AUDIO_NARRATION_LANGUAGE → SYSTEM_SETTINGS / BROADCAST_LANGUAGE
              </p>
            </div>
          </div>

          {/* Notifications */}
          <div className="space-y-4">
            <h2 className="mono-ui text-[12px] md:text-[13px] text-forest font-bold tracking-[0.2em] border-b border-forest/30 pb-2">
              PUSH_NOTIFICATIONS
            </h2>
            <NotificationToggle />
            <DailyDigest />
          </div>

          {/* Interest Matrix */}
          <div className="space-y-4" data-testid="interest-matrix-section">
            <h2 className="mono-ui text-[12px] md:text-[13px] text-forest font-bold tracking-[0.2em] border-b border-forest/30 pb-2">
              INTEREST_MATRIX
            </h2>
            <div className="narvo-border bg-surface/5 p-5 md:p-6">
              <div className="flex items-center gap-4 md:gap-6 mb-5">
                <div className="w-10 h-10 md:w-12 md:h-12 narvo-border bg-background-dark flex items-center justify-center">
                  <GridFour className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-lg md:text-xl font-bold text-content uppercase">COGNITIVE_INTEREST_GRID</h3>
                  <p className="mono-ui text-[10px] md:text-[11px] text-forest">MAP YOUR INTERESTS FOR ACCURATE NEWS DELIVERY</p>
                </div>
                {interestsSaving && (
                  <span className="mono-ui text-[10px] text-primary animate-pulse">SYNCING...</span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
                {INTEREST_CATEGORIES.map(cat => {
                  const active = interests.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleInterest(cat.id)}
                      className={`narvo-border p-3 md:p-4 text-left transition-all ${
                        active
                          ? 'bg-primary text-background-dark border-primary'
                          : 'bg-surface/5 text-forest hover:bg-surface/20 hover:border-forest'
                      }`}
                      data-testid={`interest-${cat.id}`}
                    >
                      <span className={`mono-ui text-[12px] md:text-[13px] font-bold block mb-1 ${active ? 'text-background-dark' : 'text-content'}`}>
                        {cat.label}
                      </span>
                      <span className={`mono-ui text-[9px] md:text-[10px] leading-relaxed block ${active ? 'text-background-dark/70' : 'text-forest/60'}`}>
                        {cat.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mono-ui text-[9px] md:text-[10px] text-forest/50 mt-4">
                {interests.length > 0
                  ? `${interests.length} CATEGORIES ACTIVE — FEED PRIORITIZATION ENGAGED`
                  : 'NO CATEGORIES SELECTED — ALL NEWS DELIVERED'}
              </p>
            </div>
          </div>

          {/* Settings Sections */}
          {settingsSections.map((section, sectionIdx) => (
            <div key={sectionIdx} className="space-y-4">
              <h2 className="mono-ui text-[12px] md:text-[13px] text-forest font-bold tracking-[0.2em] border-b border-forest/30 pb-2">
                {section.title}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.items.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => navigate(item.path)}
                      className="narvo-border bg-surface/5 p-5 md:p-6 text-left group hover:bg-primary/5 hover:border-primary transition-all"
                      data-testid={`settings-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 narvo-border bg-background-dark flex items-center justify-center group-hover:border-primary transition-colors">
                          <Icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                        </div>
                        <CaretRight weight="bold" className="w-5 h-5 text-forest group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                      <h3 className="font-display text-lg md:text-xl font-bold text-content uppercase mb-1 group-hover:text-primary transition-colors">
                        {item.label}
                      </h3>
                      <p className="mono-ui text-[10px] md:text-[11px] text-forest leading-relaxed">
                        {item.desc}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                        <span className="mono-ui text-[9px] md:text-[10px] text-primary font-bold">
                          {item.status}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* System Stats */}
          <div className="space-y-4">
            <h2 className="mono-ui text-[12px] md:text-[13px] text-forest font-bold tracking-[0.2em] border-b border-forest/30 pb-2">
              SYSTEM_DIAGNOSTICS
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {systemStats.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div key={idx} className="narvo-border bg-surface/5 p-4 md:p-5">
                    <Icon className="w-4 h-4 text-forest mb-3" />
                    <span className="mono-ui text-[9px] md:text-[10px] text-forest block mb-1">
                      {stat.label}
                    </span>
                    <span className="mono-ui text-[13px] md:text-xs text-primary font-bold">
                      {stat.value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tour Guide */}
          <div className="space-y-4">
            <h2 className="mono-ui text-[12px] md:text-[13px] text-forest font-bold tracking-[0.2em] border-b border-forest/30 pb-2">
              GUIDED_TOUR
            </h2>
            <div className="narvo-border bg-surface/5 p-5 md:p-6">
              <div className="flex items-center gap-4 md:gap-6">
                <div className="w-10 h-10 md:w-12 md:h-12 narvo-border bg-background-dark flex items-center justify-center">
                  <Compass weight="fill" className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-lg md:text-xl font-bold text-content uppercase">REPLAY_TOUR</h3>
                  <p className="mono-ui text-[10px] md:text-[11px] text-forest">WALK THROUGH NARVO'S KEY FEATURES AGAIN</p>
                </div>
                <button
                  onClick={() => { resetTourGuide(); openTourGuide(); }}
                  className="px-4 py-2.5 bg-primary text-background-dark mono-ui text-[11px] font-bold hover:bg-white transition-all flex items-center gap-2"
                  data-testid="replay-tour-btn"
                >
                  <Compass weight="bold" className="w-3.5 h-3.5" />
                  LAUNCH
                </button>
              </div>
            </div>
          </div>

          {/* Haptic Alert Demo */}
          <div className="space-y-4">
            <h2 className="mono-ui text-[12px] md:text-[13px] text-forest font-bold tracking-[0.2em] border-b border-forest/30 pb-2">
              NOTIFICATION_TEST_PANEL
            </h2>
            <p className="mono-ui text-[11px] text-forest/70 mb-4">
              Test haptic alert patterns for different system events
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button 
                onClick={() => showAlert('SYNC_SUCCESS')}
                className="narvo-border bg-primary/10 p-4 hover:bg-primary/20 transition-colors text-left"
                data-testid="test-sync-success"
              >
                <Bell weight="fill" className="w-4 h-4 text-primary mb-2" />
                <span className="mono-ui text-[11px] text-primary font-bold block">SYNC_SUCCESS</span>
              </button>
              <button 
                onClick={() => showAlert('BREAKING_NEWS')}
                className="narvo-border bg-red-500/10 p-4 hover:bg-red-500/20 transition-colors text-left"
                data-testid="test-breaking-news"
              >
                <Lightning weight="fill" className="w-4 h-4 text-red-500 mb-2" />
                <span className="mono-ui text-[11px] text-red-500 font-bold block">BREAKING_NEWS</span>
              </button>
              <button 
                onClick={() => showAlert('BOOKMARK_ADDED')}
                className="narvo-border bg-forest/10 p-4 hover:bg-forest/20 transition-colors text-left"
                data-testid="test-bookmark"
              >
                <Bell weight="fill" className="w-4 h-4 text-forest mb-2" />
                <span className="mono-ui text-[11px] text-forest font-bold block">BOOKMARK_ADDED</span>
              </button>
              <button 
                onClick={() => showAlert('NETWORK_ERROR')}
                className="narvo-border bg-red-500/10 p-4 hover:bg-red-500/20 transition-colors text-left"
                data-testid="test-network-error"
              >
                <Bell weight="fill" className="w-4 h-4 text-red-400 mb-2" />
                <span className="mono-ui text-[11px] text-red-400 font-bold block">NETWORK_ERROR</span>
              </button>
            </div>
          </div>

          {/* Version + Logout */}
          <div className="pt-6 md:pt-8 border-t border-forest/20">
            <p className="mono-ui text-[10px] text-forest/50 text-center mb-4">
              {t('settings.version')}
            </p>
            <button 
              onClick={handleLogout} 
              className="w-full narvo-border bg-surface/5 text-forest font-display font-bold py-4 md:py-5 text-sm md:text-base hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400 transition-all flex items-center justify-center gap-3 uppercase group" 
              data-testid="logout-btn"
            >
              <SignOut weight="bold" className="w-5 h-5 group-hover:translate-x-[-4px] transition-transform" />
              <span>[{t('settings.logout')}]</span>
            </button>
          </div>

        </div>
      </div>
    </main>
  );
};

export default SettingsPage;
