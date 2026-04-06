'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { DesktopRail } from './DesktopRail';
import { MobileNavDock } from './MobileNavDock';
import { RailLayoutProvider, useRailLayout } from './RailLayoutContext';
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
    <RailLayoutProvider>
      <div className="min-h-screen min-h-[100dvh] flex bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors lg:h-[100dvh] lg:max-h-[100dvh] lg:overflow-hidden">
        <NarvoNotificationBootstrap />
        <NarvoFeatureTutorial pathname={pathname} />
        <DesktopRail pathname={pathname} />
        <ShellMainColumn header={header}>{children}</ShellMainColumn>
        <MobileNavDock pathname={pathname} />
      </div>
    </RailLayoutProvider>
  );
}

function ShellMainColumn({
  header,
  children,
}: {
  header: AppUniversalHeaderProps;
  children: React.ReactNode;
}) {
  const { mainMarginClass } = useRailLayout();
  return (
    <div className={`flex flex-1 flex-col min-w-0 min-h-0 ${mainMarginClass}`}>
      <AppUniversalHeader {...header} />
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-[calc(6rem+env(safe-area-inset-bottom,0px))] lg:pb-8">
        {children}
      </div>
    </div>
  );
}
