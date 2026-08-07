import { useCallback, useSyncExternalStore } from 'react';

import { createExternalStore } from '@/lib/externalStore';

const STORAGE_KEY = 'nebulens-generation-sessions-v1';
const DEFAULT_SESSION_TITLE = '未命名会话';

export interface GenerationSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  batchIds: string[];
}

interface SessionState {
  sessions: GenerationSession[];
}

function isSession(value: unknown): value is GenerationSession {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<GenerationSession>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.updatedAt === 'string' &&
    Array.isArray(candidate.batchIds) &&
    candidate.batchIds.every((batchId) => typeof batchId === 'string')
  );
}

function readSessions(): GenerationSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isSession) : [];
  } catch {
    return [];
  }
}

const store = createExternalStore<SessionState>({ sessions: readSessions() });

function persist(sessions: GenerationSession[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Persistence is best-effort; the session still works for the current tab.
  }
}

function setSessions(next: SessionState | ((current: SessionState) => SessionState)): void {
  store.set(next);
  persist(store.getSnapshot().sessions);
}

function sessionId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function titleFromPrompt(prompt: string): string {
  const value = prompt.replace(/\s+/g, ' ').trim();
  if (!value) return DEFAULT_SESSION_TITLE;
  return value.length > 30 ? `${value.slice(0, 30).trimEnd()}…` : value;
}

export function createGenerationSession(title = DEFAULT_SESSION_TITLE): GenerationSession {
  const now = new Date().toISOString();
  const session: GenerationSession = {
    id: sessionId(),
    title: titleFromPrompt(title),
    createdAt: now,
    updatedAt: now,
    batchIds: [],
  };
  setSessions((current) => ({ sessions: [session, ...current.sessions] }));
  return session;
}

export function renameGenerationSession(id: string, title: string): void {
  const nextTitle = titleFromPrompt(title);
  setSessions((current) => ({
    sessions: current.sessions.map((session) =>
      session.id === id
        ? { ...session, title: nextTitle, updatedAt: new Date().toISOString() }
        : session,
    ),
  }));
}

export function removeGenerationSession(id: string): void {
  setSessions((current) => ({
    sessions: current.sessions.filter((session) => session.id !== id),
  }));
}

export function attachGenerationBatch(id: string, batchId: string, prompt?: string): void {
  setSessions((current) => {
    const session = current.sessions.find((candidate) => candidate.id === id);
    if (!session) return current;
    const title =
      prompt && session.title === DEFAULT_SESSION_TITLE ? titleFromPrompt(prompt) : session.title;
    const updated: GenerationSession = {
      ...session,
      title,
      updatedAt: new Date().toISOString(),
      batchIds: session.batchIds.includes(batchId)
        ? session.batchIds
        : [...session.batchIds, batchId],
    };
    return { sessions: [updated, ...current.sessions.filter((item) => item.id !== id)] };
  });
}

export function replaceGenerationBatch(id: string, previousBatchId: string, batchId: string): void {
  setSessions((current) => ({
    sessions: current.sessions.map((session) => {
      if (session.id !== id) return session;
      const batchIds = session.batchIds.map((value) =>
        value === previousBatchId ? batchId : value,
      );
      return {
        ...session,
        updatedAt: new Date().toISOString(),
        batchIds: [...new Set(batchIds)],
      };
    }),
  }));
}

export function useGenerationSessions() {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const create = useCallback((title?: string) => createGenerationSession(title), []);
  const rename = useCallback((id: string, title: string) => renameGenerationSession(id, title), []);
  const remove = useCallback((id: string) => removeGenerationSession(id), []);
  return {
    sessions: state.sessions,
    create,
    rename,
    remove,
  };
}

export function resetGenerationSessionsForTests(): void {
  setSessions({ sessions: [] });
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    store.set({ sessions: readSessions() });
  });
}
