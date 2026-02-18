import { writable } from 'svelte/store';
import type { SearchRequest } from '$lib/api';

// Holds the pending search request. Set on /search submit, read on /matches mount.
export const pendingSearch = writable<SearchRequest | null>(null);
