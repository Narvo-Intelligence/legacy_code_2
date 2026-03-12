import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Icon } from '@phosphor-icons/react/lib';
import { SignOut } from '@phosphor-icons/react/SignOut';
import { User } from '@phosphor-icons/react/User';
import { Microphone } from '@phosphor-icons/react/Microphone';
import { Monitor } from '@phosphor-icons/react/Monitor';
import { Wheelchair } from '@phosphor-icons/react/Wheelchair';
import { CaretRight } from '@phosphor-icons/react/CaretRight';
import { Globe } from '@phosphor-icons/react/Globe';
import { Compass } from '@phosphor-icons/react/Compass';
import { GridFour } from '@phosphor-icons/react/GridFour';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useHapticAlert } from '../components/HapticAlerts';
import { useSettings } from '../hooks/useSettings';
import { LANGUAGES } from '../i18n';
import { NotificationToggle } from '../components/BreakingNews';
import DailyDigest from '../components/features/DailyDigest';
import { openTourGuide, resetTourGuide } from '../components/TourGuideModal';
import { getOnboardingInterestsList, filterValidInterestIds } from '../constants/onboarding';
import { THEME_OPTIONS } from '../constants/themes';
import * as api from '../lib/api';
import logger from '../lib/logger';

interface SettingsSectionItem {
  icon: Icon;
  label: string;
  desc: string;
  path: string;
  status: string;
}

interface SettingsSection {
  title: string;
  items: SettingsSectionItem[];
}

interface SettingsApiShape {
  interface_language?: string;
  theme?: string;
  interests?: string[];
}

const SettingsPage = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showAlert } = useHapticAlert();

  const { updateSetting } = useSettings<{ interface_language: string; theme: string }, SettingsApiShape>(
    { interface_language: 'en', theme: 'nature' },
    (apiData: Record<string, unknown>): { interface_language: string; theme: string } => ({
      interface_language: String(apiData.interface_language ?? 'en'),
      theme: String(apiData.theme ?? 'nature'),
    }),
    (local) => ({ interface_language: local.interface_language, theme: local.theme })
  );

  const [interests, setInterests] = useState<string[]>(() => {
    try {
      const c = JSON.parse(localStorage.getItem('narvo_settings_cache') || '{}') as { interests?: string[] };
      return filterValidInterestIds(c.interests || []);
    } catch (err) {
      logger.debug('[SettingsPage] Failed to read interests cache', err);
      return [];
    }
  });
  const [interestsSaving, setInterestsSaving] = useState(false);

  useEffect(() => {
    const userId = user?.id || 'guest';
    api.get(`api/settings/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: { interests?: string[] } | null) => {
        const raw = data?.interests;
        setInterests(Array.isArray(raw) ? filterValidInterestIds(raw) : []);
      })
      .catch((err) => {
        logger.debug('[SettingsPage] Failed to load interests', err);
      });
  }, [user?.id]);

  const toggleInterest = useCallback((catId: string) => {
    const next = interests.includes(catId)
      ? interests.filter(i => i !== catId)
      : [...interests, catId];
    setInterests(next);
    setInterestsSaving(true);
    const userId = user?.id || 'guest';
    try {
      const existing = JSON.parse(localStorage.getItem('narvo_settings_cache') || '{}') as Record<string, unknown>;
      localStorage.setItem('narvo_settings_cache', JSON.stringify({ ...existing, interests: next }));
    } catch (err) {
      logger.debug('[SettingsPage] Failed to persist interests cache', err);
    }
    api.post(`api/settings/${userId}`, { interests: next })
      .then(() => { showAlert({ type: 'sync', title: 'INTERESTS_UPDATED', message: `${next.length} categories selected`, code: 'INT_OK', duration: 2000 }); })
      .catch((err) => {
        logger.debug('[SettingsPage] Failed to save interests', err);
      })
      .finally(() => setInterestsSaving(false));
  }, [interests, user?.id, showAlert]);

  const handleLanguageChange = useCallback((code: string) => {
    i18n.changeLanguage(code);
    updateSetting('interface_language', code);
    showAlert({ type: 'sync', title: 'LANGUAGE_CHANGED', message: `Interface set to ${code.toUpperCase()}`, code: 'LANG_OK', duration: 3000 });
  }, [i18n, updateSetting, showAlert]);

  const handleThemeSelect = useCallback((themeId: string) => {
    setTheme(themeId);
    updateSetting('theme', themeId);
  }, [setTheme, updateSetting]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (_) { /* ignore */ }
    try {
      localStorage.removeItem('narvo_user');
      localStorage.removeItem('narvo_preferences');
    } catch (_) { /* ignore */ }
    navigate('/', { replace: true });
  };

  const settingsSections: SettingsSection[] = [
    {
      title: t('settings.profile_management'),
      items: [
        { icon: User, label: t('settings.account'), desc: t('settings.account_desc'), path: '/account', status: 'PREMIUM_ACTIVE' },
        { icon: Microphone, label: t('settings.voice_studio'), desc: t('settings.voice_studio_desc'), path: '/voices', status: 'NOVA_SELECTED' },
      ],
    },
    {
      title: t('settings.system_configuration'),
      items: [
        { icon: Monitor, label: t('settings.system_settings'), desc: t('settings.system_desc'), path: '/system', status: 'CONFIGURED' },
        { icon: Wheelchair, label: t('settings.accessibility'), desc: t('settings.accessibility_desc'), path: '/accessibility', status: 'OPTIMIZED' },
      ],
    },
  ];

  const interestList = getOnboardingInterestsList();

  return (
    <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scroll bg-background-dark" data-testid="settings-page">
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

      <div className="p-4 md:p-10 pb-safe">
        <div className="max-w-4xl mx-auto space-y-8 md:space-y-12">

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

          <div className="space-y-4">
            <h2 className="mono-ui text-[12px] md:text-[13px] text-forest font-bold tracking-[0.2em] border-b border-forest/30 pb-2">
              APPEARANCE_MODE
            </h2>
            <div className="narvo-border bg-surface/5 p-5 md:p-6">
              <h3 className="font-display text-lg md:text-xl font-bold text-content uppercase mb-2">THEME_MODE</h3>
              <p className="mono-ui text-[10px] md:text-[11px] text-forest mb-4">CHOOSE NATURE, SUN, OR MOON</p>
              <div className="flex flex-wrap gap-2">
                {THEME_OPTIONS.map((opt) => {
                  const isActive = theme === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleThemeSelect(opt.id)}
                      className={`flex items-center gap-2 px-4 py-3 narvo-border transition-all
                        ${isActive
                          ? 'bg-primary/15 border-primary text-primary'
                          : 'bg-surface/10 hover:bg-primary/10 hover:border-primary/50 text-content-secondary'}`}
                      data-testid={`settings-theme-${opt.id}`}
                    >
                      <opt.Icon weight="fill" className="w-5 h-5 shrink-0" />
                      <span className="mono-ui text-[12px] font-bold uppercase">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

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
                {LANGUAGES.map((lang: { code: string; label: string }) => (
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

          <div className="space-y-4">
            <h2 className="mono-ui text-[12px] md:text-[13px] text-forest font-bold tracking-[0.2em] border-b border-forest/30 pb-2">
              PUSH_NOTIFICATIONS
            </h2>
            <NotificationToggle />
            <DailyDigest />
          </div>

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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
                {interestList.map(cat => {
                  const active = interests.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleInterest(cat.id)}
                      className={`narvo-border p-3 md:p-4 text-left transition-all min-w-0 ${
                        active
                          ? 'bg-primary text-background-dark border-primary'
                          : 'bg-surface/5 text-forest hover:bg-surface/20 hover:border-forest'
                      }`}
                      data-testid={`interest-${cat.id}`}
                    >
                      <span className={`mono-ui text-[11px] md:text-[12px] font-bold block truncate ${active ? 'text-background-dark' : 'text-content'}`}>
                        {cat.name.toUpperCase()}
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
