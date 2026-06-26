import { useEffect, useState, useCallback } from "react";
import { apiGet, apiPatch, apiDelete } from "@/lib/api";
import type { Notification } from "@/lib/types";

export function useNotifications(enabled: boolean) {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const { data } = await apiGet<{ notifications: any[] }>("/notifications");
      const mapped: Notification[] = (data.notifications || []).map((n) => ({
        ...n,
        read: typeof n.isRead === "boolean" ? n.isRead : !!n.read,
      }));
      setItems(mapped);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
    if (!enabled) return;
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [enabled, refresh]);

  const markRead = async (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
    );
    try {
      await apiPatch(`/notifications/${id}/read`);
    } catch {
      void refresh();
    }
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await apiPatch("/notifications/read-all");
    } catch {
      void refresh();
    }
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((n) => n._id !== id));
    try {
      await apiDelete(`/notifications/${id}`);
    } catch {
      void refresh();
    }
  };

  const unread = items.filter((n) => !n.read).length;
  return { items, unread, loading, refresh, markRead, markAllRead, remove };
}
