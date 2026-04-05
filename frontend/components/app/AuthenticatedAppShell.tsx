'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { DesktopRail } from './DesktopRail';
import { MobileNavDock } from './MobileNavDock';
import { AppUniversalHeader, type AppUniversalHeaderProps } from './AppUniversalHeader';
import { NarvoNotificationBootstrap } from './NarvoNotificationBootstrap';
import { NarvoFeatureTutorial } from './NarvoFeatureTutorial';

type AuthenticatedAppShellProps = {
  children: React.ReactNode;
  header: AppUniversalHeaderProps;
};

/**
 * Authenticated shell — UI_UX_Revamp_Workflow_v1 Phase 3: rail + dock + top header.
 * Page_Surface_Map_v1 §8: large UI canvas for habit surfaces (dashboard, briefing, discover).
 */
export function AuthenticatedAppShell({ children, header }: AuthenticatedAppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen min-h-[100dvh] flex bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors lg:h-[100dvh] lg:max-h-[100dvh] lg:overflow-hidden">
      <NarvoNotificationBootstrap />
      <NarvoFeatureTutorial pathname={pathname} />
      <DesktopRail pathname={pathname} />
      <div className="flex flex-1 flex-col min-w-0 min-h-0 lg:ml-[4.5rem] xl:ml-[15.5rem]">
        <AppUniversalHeader {...header} />
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] lg:pb-8">
          {children}
        </div>
      </div>
      <MobileNavDock pathname={pathname} />
    </div>
  );
}
