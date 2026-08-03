import { useCallback, useEffect, useMemo, useState } from 'react';
import { createT, localeTag } from '../core/i18n';
import {
  clearLocalData,
  getCheckHistory,
  getSettings,
  saveCheckHistory,
  saveSettings,
  summarizeLocalData,
} from '../core/storage/store';
import type {
  AppSettings,
  CheckHistoryItem,
  DataCategory,
} from '../core/types';

export type TabId = 'check' | 'history' | 'settings' | 'about' | 'how';

export function useAppState() {
  const [tab, setTab] = useState<TabId>('check');
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const [checkHistory, setCheckHistory] = useState<CheckHistoryItem[]>(() =>
    getCheckHistory()
  );
  const [tick, setTick] = useState(0);
  /** When set, Check screen shows this past result. */
  const [activeResult, setActiveResult] = useState<CheckHistoryItem | null>(
    null
  );

  const t = useMemo(() => createT(settings.locale), [settings.locale]);

  useEffect(() => {
    const root = document.documentElement;
    let theme = settings.theme;
    if (theme === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    root.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    document.documentElement.lang = localeTag(settings.locale);
  }, [settings.theme, settings.locale]);

  const updateSettings = useCallback((next: AppSettings) => {
    saveSettings(next);
    setSettings(next);
  }, []);

  const pushCheckHistory = useCallback((item: CheckHistoryItem) => {
    setCheckHistory((prev) => {
      const next = [item, ...prev].slice(0, 30);
      saveCheckHistory(next);
      return next;
    });
  }, []);

  const removeCheckHistory = useCallback((id: string) => {
    setCheckHistory((prev) => {
      const next = prev.filter((item) => item.id !== id);
      saveCheckHistory(next);
      return next;
    });
  }, []);

  const cleanData = useCallback((category: DataCategory = 'all') => {
    clearLocalData(category);
    if (category === 'all' || category === 'settings') {
      setSettings(getSettings());
    }
    if (category === 'all' || category === 'checkHistory') {
      setCheckHistory(getCheckHistory());
      setActiveResult(null);
    }
    setTick((n) => n + 1);
  }, []);

  const dataSummary = useMemo(
    () => summarizeLocalData(),
    [checkHistory, settings, tick]
  );

  return {
    tab,
    setTab,
    settings,
    updateSettings,
    checkHistory,
    pushCheckHistory,
    removeCheckHistory,
    activeResult,
    setActiveResult,
    cleanData,
    dataSummary,
    t,
  };
}

export type AppState = ReturnType<typeof useAppState>;
