import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { 
  House, 
  Headphones, 
  Compass, 
  Books, 
  Gear, 
  Hash,
  Crown
} from '@phosphor-icons/react';
import { useAuth } from '../contexts/AuthContext';

/**
 * DesktopRail — Primary navigation for large viewports.
 * v5.1: 240px fixed, Petrol Teal deep, Newsreader Brand.
 */
export const DesktopRail: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const navItems = [
    { to: '/dashboard', icon: House, label: t('nav.home') },
    { to: '/listen', icon: Headphones, label: t('nav.listen'), live: true },
    { to: '/discover', icon: Compass, label: t('nav.discover') },
    { to: '/library', icon: Books, label: t('nav.library') },
  ];

  const topics = [
    { label: t('categories.business') },
    { label: t('categories.tech') },
    { label: t('categories.politics') },
  ];

  return (
    <aside className="hidden md:flex flex-col w-[240px] h-screen fixed left-0 top-0 bg-primary-deep text-white/70 overflow-y-auto font-body border-r border-white/5 z-40 transition-all duration-300">
      {/* Brand / Logo Area */}
      <div className="p-8 pb-4">
        <h1 className="font-display text-3xl font-bold text-white tracking-tight">Narvo</h1>
      </div>

      {/* Primary Navigation Cluster */}
      <nav className="px-4 py-6 space-y-1.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `
              flex items-center w-full px-4 py-3.5 rounded-xl font-bold transition-all duration-200 group
              ${isActive 
                ? 'bg-primary text-primary-deep shadow-md scale-[1.02]' 
                : 'hover:bg-white/5 hover:text-white'}
            `}
          >
            <item.icon 
              size={22} 
              weight={item.live ? 'fill' : 'bold'} 
              className={`mr-3.5 transition-transform group-hover:scale-110 ${item.live && !location.pathname.includes(item.to) ? 'text-alert' : ''}`} 
            />
            <span className="text-[15px] tracking-tight">{item.label}</span>
            {item.live && (
              <span className="ml-auto w-2 h-2 bg-alert rounded-full shadow-[0_0_10px_rgb(var(--color-alert))] animate-pulse"></span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-8 py-2">
        <div className="h-px bg-white/10 w-full" />
      </div>

      {/* Secondary Clusters / Collections */}
      <div className="px-4 py-6">
        <h3 className="px-4 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-white/40 mb-4 text-left">
          {t('nav.your_topics')}
        </h3>
        <ul className="space-y-1">
          {topics.map(topic => (
            <li key={topic.label}>
              <button className="flex w-full items-center px-4 py-2.5 hover:bg-white/5 hover:text-white rounded-lg text-[14px] font-medium transition-all group overflow-hidden">
                <Hash size={18} weight="bold" className="mr-3.5 text-white/20 group-hover:text-primary transition-colors" />
                <span className="truncate">{topic.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Utilities & Profile */}
      <div className="mt-auto p-4 space-y-3">
        <NavLink
            to="/settings"
            className={({ isActive }) => `
              flex items-center w-full px-4 py-3 rounded-xl font-bold transition-all
              ${isActive ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white'}
            `}
          >
          <Gear size={20} weight="bold" className="mr-3.5" />
          <span className="text-[14px]">{t('nav.settings')}</span>
        </NavLink>
        
        {/* Profile Card */}
        <div className="p-3.5 flex items-center bg-white/5 rounded-2xl border border-white/5 cursor-pointer hover:bg-white/10 transition-all group">
           <div className="w-10 h-10 rounded-xl bg-primary text-primary-deep flex items-center justify-center font-bold text-sm shrink-0 shadow-inner group-hover:scale-105 transition-transform">
             {user?.user_metadata?.first_name?.substring(0, 1) || user?.email?.substring(0, 1).toUpperCase() || 'N'}
           </div>
           <div className="ml-3 overflow-hidden text-left">
             <p className="text-[13px] font-bold text-white truncate leading-tight">
               {user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Member'}
             </p>
             <p className="text-[10px] font-mono font-bold text-white/40 flex items-center gap-1 uppercase tracking-wider">
               <Crown size={10} weight="fill" className="text-primary" />
               Pro Member
             </p>
           </div>
        </div>
      </div>
    </aside>
  );
};
