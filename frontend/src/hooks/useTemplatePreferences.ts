import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'nebulens.template-preferences';

interface TemplatePreferences {
  schemaVersion: 1;
  favoriteIds: string[];
  recent: Record<string, string>;
}

const EMPTY: TemplatePreferences = { schemaVersion: 1, favoriteIds: [], recent: {} };

function readPreferences(): TemplatePreferences {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!parsed || typeof parsed !== 'object') return EMPTY;
    const value = parsed as Record<string, unknown>;
    if (value['schemaVersion'] !== 1 || !Array.isArray(value['favoriteIds'])) return EMPTY;
    const favoriteIds = value['favoriteIds'];
    const recent = value['recent'];
    if (!favoriteIds.every((item) => typeof item === 'string')) return EMPTY;
    if (!recent || typeof recent !== 'object' || Array.isArray(recent)) return EMPTY;
    const validRecent = Object.entries(recent).every(
      ([id, date]) => id.length > 0 && typeof date === 'string',
    );
    return validRecent
      ? { schemaVersion: 1, favoriteIds: [...favoriteIds], recent: { ...recent } }
      : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function useTemplatePreferences() {
  const [preferences, setPreferences] = useState(readPreferences);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const toggleFavorite = useCallback((id: string) => {
    setPreferences((current) => ({
      ...current,
      favoriteIds: current.favoriteIds.includes(id)
        ? current.favoriteIds.filter((item) => item !== id)
        : [...current.favoriteIds, id],
    }));
  }, []);

  const markUsed = useCallback((id: string) => {
    setPreferences((current) => ({
      ...current,
      recent: { ...current.recent, [id]: new Date().toISOString() },
    }));
  }, []);

  return {
    favoriteIds: preferences.favoriteIds,
    recent: preferences.recent,
    toggleFavorite,
    markUsed,
  };
}
