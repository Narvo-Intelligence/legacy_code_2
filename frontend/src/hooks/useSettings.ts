import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../lib/api';

const LS_KEY = 'narvo_settings_cache';

const getLocalSettings = (): Record<string, unknown> | null => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

const setLocalSettings = (settings: Record<string, unknown>): void => {
  try {
    const existing = getLocalSettings() ?? {};
    const merged = { ...existing, ...settings };
    localStorage.setItem(LS_KEY, JSON.stringify(merged));
  } catch {
    /* ignore */
  }
};

export interface UseSettingsOptions<T, P> {
  defaults: T;
  mapFromApi?: (apiData: Record<string, unknown>) => T;
  mapToApi?: (localShape: T) => P;
}

export function useSettings<T extends Record<string, unknown>, P = Record<string, unknown>>(
  defaults: T,
  mapFromApi?: (apiData: Record<string, unknown>) => T,
  mapToApi?: (localShape: T) => P
): {
  settings: T;
  setSettings: React.Dispatch<React.SetStateAction<T>>;
  updateSetting: (key: keyof T, value: T[keyof T]) => void;
  saveAll: () => Promise<boolean>;
  loading: boolean;
  saving: boolean;
  hasChanges: boolean;
  setHasChanges: (v: boolean) => void;
} {
  const { user } = useAuth();
  const [settings, setSettings] = useState<T>(() => {
    const cached = getLocalSettings();
    if (cached) {
      return mapFromApi ? mapFromApi(cached) : ({ ...defaults, ...cached } as T);
    }
    return defaults;
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const userId = user?.id ?? 'guest';
    api
      .get(`api/settings/${userId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Record<string, unknown> | null) => {
        if (data) {
          setLocalSettings(data);
          const mapped = mapFromApi ? mapFromApi(data) : ({ ...defaults, ...data } as T);
          setSettings(mapped);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveToServer = useCallback(
    async (settingsToSave: T): Promise<boolean> => {
      const userId = user?.id ?? 'guest';
      const payload = mapToApi ? mapToApi(settingsToSave) : (settingsToSave as unknown as P);
      setLocalSettings(payload as unknown as Record<string, unknown>);
      try {
        const res = await api.post(`api/settings/${userId}`, payload as object);
        return res.ok;
      } catch {
        return false;
      }
    },
    [user?.id, mapToApi]
  );

  const updateSetting = useCallback(
    (key: keyof T, value: T[keyof T]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        setHasChanges(true);
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(async () => {
          setSaving(true);
          const ok = await saveToServer(next);
          if (ok) setHasChanges(false);
          setSaving(false);
        }, 800);
        return next;
      });
    },
    [saveToServer]
  );

  const saveAll = useCallback(async () => {
    setSaving(true);
    const ok = await saveToServer(settings);
    if (ok) setHasChanges(false);
    setSaving(false);
    return ok;
  }, [settings, saveToServer]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return { settings, setSettings, updateSetting, saveAll, loading, saving, hasChanges, setHasChanges };
}
