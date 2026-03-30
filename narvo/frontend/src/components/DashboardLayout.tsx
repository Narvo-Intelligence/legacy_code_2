/**
 * DashboardLayout — authenticated app shell.
 *
 * Vertical stack (flex-col, h-dvh):
 *   DashboardHeader  (shrink-0, h-[--header-h] → h-[--header-h-desktop])
 *   BreakingNewsBanner (shrink-0, conditional)
 *   ── flex-1 row ──
 *     DashboardSidebar (hidden on mobile)
 *     #main-content (Outlet — flex-1, min-h-0, overflow-hidden)
 *   AudioPlayerBar (desktop only: shrink-0 inline / mobile: fixed via own positioning)
 *   MobileNav (mobile only: fixed, z-50)
 *
 * Each page's scroll container uses .page-scroll + .pb-safe from index.css.
 * No hardcoded heights or magic pb numbers in pages.
 */
import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardHeader from './DashboardHeader';
import DashboardSidebar from './DashboardSidebar';
import MobileNav from './MobileNav';
import AudioPlayerBar from './AudioPlayerBar';
import { BreakingNewsBanner } from './BreakingNews';
import { applyAccessibilityFromCache, NARVO_SETTINGS_UPDATED } from '../lib/accessibilityApply';
import { readString, writeString } from '../lib/storage';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = readString('narvo_sidebar');
    if (saved !== null) return saved === 'true';
    return true;
  });
  const location = useLocation();

  useEffect(() => { applyAccessibilityFromCache(); }, []);

  useEffect(() => {
    const handler = () => applyAccessibilityFromCache();
    window.addEventListener(NARVO_SETTINGS_UPDATED, handler);
    return () => window.removeEventListener(NARVO_SETTINGS_UPDATED, handler);
  }, []);

  useEffect(() => {
    writeString('narvo_sidebar', String(sidebarOpen));
  }, [sidebarOpen]);

  const toggleSidebar = () => setSidebarOpen((p) => !p);

  return (
    <div
      className="h-dvh flex flex-col bg-[rgb(var(--color-bg))] overflow-hidden"
      data-testid="dashboard-layout"
    >
      <DashboardHeader onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
      <BreakingNewsBanner />

      <div className="flex-1 flex overflow-hidden relative min-h-0">
        <DashboardSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onToggle={toggleSidebar}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden"
            id="main-content"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Desktop audio bar — inline flow */}
      <AudioPlayerBar />

      {/* Mobile bottom nav — fixed, z-50 */}
      <MobileNav />
    </div>
  );
};

export default DashboardLayout;
