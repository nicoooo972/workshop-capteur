import { writable } from 'svelte/store';

interface User {
  id: string;
  email: string;
  role: string;
}

function createAuthStore() {
  const { subscribe, set, update } = writable<{ user: User | null; isAuthenticated: boolean }>({
    user: null,
    isAuthenticated: false
  });

  return {
    subscribe,
    login: (user: User) => set({ user, isAuthenticated: true }),
    logout: () => set({ user: null, isAuthenticated: false }),
  };
}

export const auth = createAuthStore();