import { create } from "zustand";

interface SidebarState {
  isCollapsed: boolean;
  isOpenMobile: boolean;
  toggleCollapsed: () => void;
  toggleMobile: () => void;
  closeMobile: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: true,
  isOpenMobile: false,
  toggleCollapsed: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  toggleMobile: () => set((state) => ({ isOpenMobile: !state.isOpenMobile })),
  closeMobile: () => set({ isOpenMobile: false }),
}));
