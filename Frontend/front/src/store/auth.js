import { create } from "zustand";

const LS_KEY = "adaptive_exam_auth";

function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "null"); }
  catch { return null; }
}

function save(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

function clear() {
  localStorage.removeItem(LS_KEY);
}

export const authStore = create((set, get) => {
  const cached = load();

  return {
    token: cached?.token || null,
    user: cached?.user || null, 

    isAuthed: () => !!get().token,

    setSession: ({ token, user }) => {
      save({ token, user });
      set({ token, user });
    },

    logout: () => {
      clear();
      set({ token: null, user: null });
    },
  };
});