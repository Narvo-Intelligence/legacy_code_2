import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  House, 
  Headphones, 
  Compass, 
  Books, 
  UserCircle 
} from '@phosphor-icons/react';

type NavItem = {
  id: string;
  to: string;
  labelKey: string;
  icon: React.ElementType;
  isAudioActive?: boolean;
};

/**
 * NavDock — Primary mobile navigation.
 * v5.1: Floating dock, 24px radius, Petrol Teal active states.
 */
export const NavDock: React.FC = () => {
  const { t } = useTranslation();

  const navItems: NavItem[] = [
    { id: 'home', to: '/dashboard', labelKey: 'nav.home', icon: House },
    { id: 'listen', to: '/listen', labelKey: 'nav.listen', icon: Headphones, isAudioActive: true },
    { id: 'discover', to: '/discover', labelKey: 'nav.discover', icon: Compass },
    { id: 'library', to: '/library', labelKey: 'nav.library', icon: Books },
    { id: 'profile', to: '/profile', labelKey: 'nav.profile', icon: UserCircle },
  ];

  return (
    <div className="fixed bottom-6 inset-x-0 mx-auto w-[92%] max-w-sm z-50 md:hidden pb-safe animate-in slide-in-from-bottom-12 duration-700 ease-[0.19,1,0.22,1]">
      <nav className="flex items-center justify-between px-3 py-2 bg-[rgb(var(--color-surface))]/90 backdrop-blur-xl rounded-[28px] shadow-[var(--shadow-lg)] border border-[rgb(var(--color-border-subtle))] overflow-hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            className={({ isActive }) => `
              relative flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all duration-300
              ${isActive 
                ? 'text-primary scale-110' 
                : 'text-content-dim hover:bg-surface-alt'}
            `}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div 
                    layoutId="nav-dock-indicator"
                    className="absolute inset-0 bg-primary/10 rounded-full -z-10"
                    transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
                  />
                )}
                <div className="relative">
                  <item.icon size={22} weight={isActive ? "fill" : "bold"} />
                  {item.isAudioActive && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-alert/75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-alert border border-surface"></span>
                    </span>
                  )}
                </div>
                <span className={`text-[9px] mt-1 font-body font-bold uppercase tracking-wider ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                  {t(item.labelKey)}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
