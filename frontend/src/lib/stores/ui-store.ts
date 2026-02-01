import { create } from "zustand";

export type View = "home" | "catalog";

interface UIState {
  sidebarOpen: boolean;
  currentView: View;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setView: (view: View) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  currentView: "home",
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setView: (view) => set({ currentView: view }),
}));
