import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardHeader from './DashboardHeader';
import DashboardSidebar from './DashboardSidebar';
import MobileNav from './MobileNav';
import AudioPlayerBar from './AudioPlayerBar';
import { BreakingNewsBanner } from './BreakingNews';
import { applyAccessibilityFromCache, NARVO_SETTINGS_UPDATED } from '../lib/accessibilityApply';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('narvo_sidebar');
    if (saved !== null) return saved === 'true';
    return true;
  });
  const location = useLocation();

  useEffect(() => {
    applyAccessibilityFromCache();
  }, []);

  useEffect(() => {
    const handler = () => applyAccessibilityFromCache();
    window.addEventListener(NARVO_SETTINGS_UPDATED, handler);
    return () => window.removeEventListener(NARVO_SETTINGS_UPDATED, handler);
  }, []);

  useEffect(() => {
    localStorage.setItem('narvo_sidebar', String(sidebarOpen));
  }, [sidebarOpen]);

  const toggleSidebar = () => setSidebarOpen((p) => !p);

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-[rgb(var(--color-bg))]" data-testid="dashboard-layout">
      <DashboardHeader onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
      <BreakingNewsBanner />
      <div className="flex-1 flex overflow-hidden relative mb-36 md:mb-0">
        <DashboardSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onToggle={toggleSidebar} />
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden"
            id="main-content"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </div>
      <AudioPlayerBar />
      <MobileNav />
    </div>
  );
};

export default DashboardLayout;
