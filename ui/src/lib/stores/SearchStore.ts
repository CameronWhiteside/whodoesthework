import { writable } from 'svelte/store';
import type { SearchRequest } from '$lib/api';

// Holds the pending search request (used for deep-dive context).
export const pendingSearch = writable<SearchRequest | null>(null);
