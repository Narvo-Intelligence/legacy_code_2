/**
 * DashboardLayout — Narratively-driven app shell.
 * v5.1: 240px DesktopRail offset, Petrol Teal deeper palette.
 * 
 * Vertical stack (flex-col, h-dvh):
 *   DashboardHeader  (shrink-0)
 *   BreakingNewsBanner (shrink-0, conditional)
 *   ── flex-1 row ──
 *     DesktopRail (hidden on mobile)
 *     #main-content (Outlet — flex-1, min-h-0, overflow-hidden)
 *   AudioPlayerBar (fixed bottom)
 *   NavDock (mobile only: fixed, z-50)
 */
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardHeader from './DashboardHeader';
import { DesktopRail } from './DesktopRail';
import { NavDock } from './NavDock';
import AudioPlayerBar from './AudioPlayerBar';
import { BreakingNewsBanner } from './BreakingNews';
import { applyAccessibilityFromCache, NARVO_SETTINGS_UPDATED } from '../lib/accessibilityApply';

const DashboardLayout = () => {
  const location = useLocation();

  useEffect(() => { applyAccessibilityFromCache(); }, []);

  useEffect(() => {
    const handler = () => applyAccessibilityFromCache();
    window.addEventListener(NARVO_SETTINGS_UPDATED, handler);
    return () => window.removeEventListener(NARVO_SETTINGS_UPDATED, handler);
  }, []);

  return (
    <div className="min-h-screen bg-bg overflow-hidden flex flex-col font-body">
      {/* ── v5.1 Nav Systems ── */}
      <DesktopRail />
      <NavDock />

      {/* ── Main Layout Container ── 
          Left space offset for DesktopRail (240px)
      */}
      <div className="md:pl-[240px] flex flex-col h-screen overflow-hidden relative transition-all duration-300">
        <DashboardHeader />
        <BreakingNewsBanner />

        <main className="flex-1 flex flex-col relative min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: [0.19, 1, 0.22, 1] }}
              className="flex-1 flex flex-col min-h-0 min-w-0"
              id="main-content"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Global Audio Player Interaction Layer */}
        <AudioPlayerBar />
      </div>
    </div>
  );
};

export default DashboardLayout;
