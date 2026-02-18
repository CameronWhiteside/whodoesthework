import { writable } from 'svelte/store';
import type { MatchResult } from '$lib/api';

const STORAGE_KEY = 'wdtw_shortlist';

/**
 * Shortlist state lives entirely in localStorage.
 * No server round-trips — the demo is single-user and session-scoped.
 * localStorage (not sessionStorage) so the shortlist survives page refreshes
 * during a demo session.
 */
function createShortlistStore() {
  // Seed from localStorage on init (handles browser refresh)
  const initial: MatchResult[] = (() => {
    if (typeof localStorage === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    } catch {
      return [];
    }
  })();

  const { subscribe, set, update } = writable<MatchResult[]>(initial);

  // Keep localStorage in sync whenever the store changes
  function persist(list: MatchResult[]) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
    return list;
  }

  return {
    subscribe,

    add(match: MatchResult) {
      update(list => {
        if (list.find(m => m.username === match.username)) return list;
        return persist([...list, match]);
      });
    },

    remove(username: string) {
      update(list => persist(list.filter(m => m.username !== username)));
    },

    clear() {
      set(persist([]));
    },

    has(username: string): boolean {
      // Read directly from localStorage to avoid subscribing in non-reactive contexts
      try {
        const list: MatchResult[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
        return list.some(m => m.username === username);
      } catch {
        return false;
      }
    },
  };
}

export const shortlistStore = createShortlistStore();
