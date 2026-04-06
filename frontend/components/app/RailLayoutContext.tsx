'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const LS_RAIL_EXPANDED = 'narvo-rail-expanded';

type RailLayoutContextValue = {
  /** When true, rail shows labels (~15.5rem). When false, icon-only (~4.5rem). */
  expanded: boolean;
  setExpanded: (v: boolean) => void;
  toggleExpanded: () => void;
  railWidthClass: string;
  mainMarginClass: string;
};

const RailLayoutContext = createContext<RailLayoutContextValue | null>(null);

export function RailLayoutProvider({ children }: { children: React.ReactNode }) {
  const [expanded, setExpandedState] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_RAIL_EXPANDED);
      if (raw === '0') setExpandedState(false);
      else if (raw === '1') setExpandedState(true);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const setExpanded = useCallback((v: boolean) => {
    setExpandedState(v);
    try {
      localStorage.setItem(LS_RAIL_EXPANDED, v ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);

  const toggleExpanded = useCallback(() => {
    setExpandedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(LS_RAIL_EXPANDED, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo<RailLayoutContextValue>(() => {
    const expandedResolved = hydrated ? expanded : true;
    return {
      expanded: expandedResolved,
      setExpanded,
      toggleExpanded,
      railWidthClass: expandedResolved ? 'w-[15.5rem]' : 'w-[4.5rem]',
      mainMarginClass: expandedResolved ? 'lg:ml-[15.5rem]' : 'lg:ml-[4.5rem]',
    };
  }, [expanded, hydrated, setExpanded, toggleExpanded]);

  return <RailLayoutContext.Provider value={value}>{children}</RailLayoutContext.Provider>;
}

export function useRailLayout(): RailLayoutContextValue {
  const ctx = useContext(RailLayoutContext);
  if (!ctx) {
    throw new Error('useRailLayout must be used within RailLayoutProvider');
  }
  return ctx;
}
