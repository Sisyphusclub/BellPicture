import { useCallback, useSyncExternalStore } from 'react';

import { createExternalStore } from '@/lib/externalStore';
import {
  ASPECT_RATIOS,
  IMAGE_RESOLUTIONS,
  MAX_COUNT,
  MIN_COUNT,
  type GenerationSettingsSnapshot,
} from '@/types/image';

const STORAGE_KEY = 'nebulens-generation-sessions-v1';
const ACTIVE_SESSION_STORAGE_KEY = 'nebulens-active-generation-session-by-user-v1';
const DEFAULT_SESSION_TITLE = '未命名会话';

export interface GenerationSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  batchIds: string[];
  transientTasks: PersistedGenerationTask[];
}

export interface PersistedGenerationTask {
  id: string;
  createdAt: string;
  settings: GenerationSettingsSnapshot;
  error?: string;
}

interface SessionState {
  sessions: GenerationSession[];
}

function parseGenerationSettings(value: unknown): GenerationSettingsSnapshot | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Partial<GenerationSettingsSnapshot>;
  const aspectRatio = ASPECT_RATIOS.find((value) => value === candidate.aspectRatio);
  const resolution = IMAGE_RESOLUTIONS.find((value) => value === candidate.resolution);
  if (
    typeof candidate.prompt !== 'string' ||
    typeof candidate.model !== 'string' ||
    typeof candidate.count !== 'number' ||
    !Number.isInteger(candidate.count) ||
    candidate.count < MIN_COUNT ||
    candidate.count > MAX_COUNT ||
    aspectRatio === undefined ||
    resolution === undefined ||
    typeof candidate.isPublic !== 'boolean' ||
    !Array.isArray(candidate.referenceIds) ||
    !candidate.referenceIds.every((referenceId) => typeof referenceId === 'string')
  ) {
    return null;
  }
  return {
    prompt: candidate.prompt,
    model: candidate.model,
    count: candidate.count,
    aspectRatio,
    resolution,
    isPublic: candidate.isPublic,
    referenceIds: [...candidate.referenceIds],
  };
}

function parsePersistedTask(value: unknown): PersistedGenerationTask | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Partial<PersistedGenerationTask>;
  const settings = parseGenerationSettings(candidate.settings);
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.createdAt !== 'string' ||
    settings === null ||
    (candidate.error !== undefined && typeof candidate.error !== 'string')
  ) {
    return null;
  }
  return {
    id: candidate.id,
    createdAt: candidate.createdAt,
    settings,
    ...(candidate.error === undefined ? {} : { error: candidate.error }),
  };
}

function parseSession(value: unknown): GenerationSession | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Partial<GenerationSession>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.title !== 'string' ||
    typeof candidate.createdAt !== 'string' ||
    typeof candidate.updatedAt !== 'string' ||
    !Array.isArray(candidate.batchIds) ||
    !candidate.batchIds.every((batchId) => typeof batchId === 'string')
  ) {
    return null;
  }
  const transientTasks = Array.isArray(candidate.transientTasks)
    ? candidate.transientTasks
        .map(parsePersistedTask)
        .filter((task): task is PersistedGenerationTask => task !== null)
    : [];
  return {
    id: candidate.id,
    title: candidate.title,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
    batchIds: [...candidate.batchIds],
    transientTasks,
  };
}

function readSessions(): GenerationSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed)
      ? parsed.map(parseSession).filter((session): session is GenerationSession => session !== null)
      : [];
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

function readActiveSessionsByUser(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const parsed: unknown = JSON.parse(
      window.sessionStorage.getItem(ACTIVE_SESSION_STORAGE_KEY) ?? '{}',
    );
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([userId, sessionId]) => userId.length > 0 && typeof sessionId === 'string',
      ),
    );
  } catch {
    return {};
  }
}

function persistActiveSessionsByUser(activeSessions: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(activeSessions));
  } catch {
    // Route continuity is best-effort and must not block generation.
  }
}

export function getRememberedGenerationSession(userId: string): string | null {
  const sessionId = readActiveSessionsByUser()[userId];
  return typeof sessionId === 'string' ? sessionId : null;
}

export function rememberGenerationSession(userId: string, generationSessionId: string): void {
  if (!userId || !generationSessionId) return;
  persistActiveSessionsByUser({
    ...readActiveSessionsByUser(),
    [userId]: generationSessionId,
  });
}

export function forgetRememberedGenerationSession(userId: string): void {
  const activeSessions = readActiveSessionsByUser();
  if (!Object.prototype.hasOwnProperty.call(activeSessions, userId)) return;
  delete activeSessions[userId];
  persistActiveSessionsByUser(activeSessions);
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
    transientTasks: [],
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

export function upsertGenerationTask(sessionId: string, task: PersistedGenerationTask): void {
  setSessions((current) => ({
    sessions: current.sessions.map((session) => {
      if (session.id !== sessionId) return session;
      const transientTasks = [
        ...session.transientTasks.filter((candidate) => candidate.id !== task.id),
        task,
      ];
      return {
        ...session,
        updatedAt: new Date().toISOString(),
        batchIds: session.batchIds.includes(task.id)
          ? session.batchIds
          : [...session.batchIds, task.id],
        transientTasks,
      };
    }),
  }));
}

export function removeGenerationTask(sessionId: string, taskId: string): void {
  setSessions((current) => ({
    sessions: current.sessions.map((session) =>
      session.id === sessionId
        ? {
            ...session,
            transientTasks: session.transientTasks.filter((task) => task.id !== taskId),
          }
        : session,
    ),
  }));
}

export function removeGenerationBatch(sessionId: string, batchId: string): void {
  setSessions((current) => ({
    sessions: current.sessions.map((session) =>
      session.id === sessionId
        ? {
            ...session,
            updatedAt: new Date().toISOString(),
            batchIds: session.batchIds.filter((candidate) => candidate !== batchId),
            transientTasks: session.transientTasks.filter((task) => task.id !== batchId),
          }
        : session,
    ),
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
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    store.set({ sessions: readSessions() });
  });
}
