import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Books,
  Compass,
  Gear,
  Headphones,
  House,
  Sparkle,
  TrendUp,
  UserCircle,
} from '@phosphor-icons/react';
import { useAuth } from '../contexts/AuthContext';

type RailItem = {
  to: string;
  label: string;
  icon: React.ElementType;
  match?: string[];
  live?: boolean;
};

const isMatch = (pathname: string, to: string, match?: string[]) => {
  if (pathname === to) return true;
  if (match?.some((value) => pathname === value || pathname.startsWith(`${value}/`))) return true;
  return pathname.startsWith(`${to}/`);
};

export const DesktopRail: React.FC = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { user } = useAuth();

  const items: RailItem[] = [
    { to: '/dashboard', label: t('nav.home'), icon: House },
    { to: '/listen', label: t('nav.listen'), icon: Headphones, match: ['/briefing'], live: true },
    { to: '/discover', label: t('nav.discover'), icon: Compass },
    { to: '/library', label: t('nav.library'), icon: Books },
    { to: '/settings', label: t('nav.settings'), icon: Gear, match: ['/profile', '/subscription', '/voices', '/insights'] },
  ];

  const topicPills = [
    t('categories.business'),
    t('categories.tech'),
    t('categories.world'),
  ];

  const identity =
    user?.user_metadata?.first_name ||
    user?.user_metadata?.display_name ||
    user?.email?.split('@')[0] ||
    'Listener';

  return (
    <aside
      className="hidden md:flex fixed inset-y-0 left-0 z-40 w-[var(--rail-width)] flex-col px-4 py-5 surface-rail"
      data-testid="desktop-rail"
    >
      <div className="shell-panel h-full bg-transparent border-white/10 px-4 py-5 text-white/78">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">
            <Sparkle weight="fill" size={18} />
          </div>
          <div className="min-w-0">
            <div className="meta-eyebrow !text-white/42">Narvo Intelligence</div>
            <h1 className="section-heading mt-1 text-[28px] leading-none text-white">Narvo</h1>
          </div>
        </div>

        <nav className="mt-8 space-y-2" aria-label="Desktop primary navigation">
          {items.map((item) => {
            const active = isMatch(pathname, item.to, item.match);
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`group flex min-h-[56px] items-center gap-3 rounded-[20px] px-4 transition-all duration-200 ${
                  active
                    ? 'bg-white/12 text-white shadow-[0_18px_40px_rgba(0,0,0,0.16)]'
                    : 'text-white/70 hover:bg-white/8 hover:text-white'
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    active ? 'bg-white text-primary-deep' : 'bg-white/6 text-white/80'
                  }`}
                >
                  <Icon weight={active ? 'fill' : 'regular'} size={20} />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <div className="text-[15px] font-semibold tracking-tight">{item.label}</div>
                </div>
                {item.live && (
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-alert shadow-[0_0_14px_rgba(240,75,36,0.5)]" />
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-8 rounded-[24px] border border-white/10 bg-white/6 p-4">
          <div className="meta-eyebrow !text-white/42">{t('nav.your_topics')}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            {topicPills.map((topic) => (
              <span
                key={topic}
                className="inline-flex min-h-[32px] items-center rounded-full border border-white/10 bg-white/7 px-3 text-[11px] font-semibold text-white/76"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-auto rounded-[24px] border border-white/10 bg-white/6 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-white text-primary-deep">
              <UserCircle weight="fill" size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold text-white">{identity}</div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/46">
                <TrendUp size={12} weight="bold" />
                Daily Briefing
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
