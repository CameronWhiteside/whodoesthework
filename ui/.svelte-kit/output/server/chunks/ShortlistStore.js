import { w as writable } from "./index.js";
const STORAGE_KEY = "wdtw_shortlist";
function createShortlistStore() {
  const initial = (() => {
    if (typeof localStorage === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    } catch {
      return [];
    }
  })();
  const { subscribe, set, update } = writable(initial);
  function persist(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
    }
    return list;
  }
  return {
    subscribe,
    add(match) {
      update((list) => {
        if (list.find((m) => m.username === match.username)) return list;
        return persist([...list, match]);
      });
    },
    remove(username) {
      update((list) => persist(list.filter((m) => m.username !== username)));
    },
    clear() {
      set(persist([]));
    },
    has(username) {
      try {
        const list = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
        return list.some((m) => m.username === username);
      } catch {
        return false;
      }
    }
  };
}
const shortlistStore = createShortlistStore();
export {
  shortlistStore as s
};
