import { useState } from "react";
import { Bell, Check, Trash2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const { items, unread, markRead, markAllRead, remove } =
    useNotifications(isAuthenticated);
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-md hover:bg-surface-dark transition"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-accent-red text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-white" align="end">
        <div className="p-3 border-b flex items-center justify-between">
          <span className="font-display font-semibold">Notifications</span>
          <button
            onClick={markAllRead}
            className="text-xs text-accent-teal hover:underline"
          >
            Mark all read
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto divide-y">
          {items.length === 0 && (
            <div className="p-6 text-center text-sm text-text-muted-light">
              You're all caught up.
            </div>
          )}
          {items.map((n) => (
            <div
              key={n._id}
              className={cn(
                "p-3 flex items-start gap-2 text-sm",
                !n.read && "bg-surface-light",
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-text-on-light">{n.title}</div>
                <div className="text-text-muted-light text-xs">
                  {n.message}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                {!n.read && (
                  <button
                    onClick={() => markRead(n._id)}
                    className="text-accent-teal"
                    title="Mark read"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => remove(n._id)}
                  className="text-text-muted-light hover:text-accent-red"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
