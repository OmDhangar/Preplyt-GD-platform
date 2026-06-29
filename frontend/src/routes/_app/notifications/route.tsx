import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { PageHeader } from "@/components/brand/PageHeader";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/notifications")({
  ssr: false,
  component: NotificationsPage,
});

function NotificationsPage() {
  const { isAuthenticated } = useAuth();
  const { items, markRead, markAllRead, remove } = useNotifications(isAuthenticated);

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="all activity"
        actions={
          <Button variant="outline" onClick={markAllRead}>Mark all read</Button>
        }
      />
      <ul className="bg-white border rounded-2xl divide-y">
        {items.length === 0 && (
          <li className="p-8 text-center text-text-muted-light">
            You're all caught up.
          </li>
        )}
        {items.map((n) => (
          <li key={n._id}
            className={cn("p-4 flex items-start gap-3", !n.read && "bg-surface-light")}>
            <div className="flex-1 min-w-0">
              <div className="font-medium">{n.title}</div>
              <div className="text-sm text-text-muted-light">{n.message}</div>
              <div className="text-xs text-text-muted-light mt-1">
                {new Date(n.createdAt).toLocaleString()}
              </div>
            </div>
            {!n.read && (
              <button onClick={() => markRead(n._id)}
                className="text-xs text-accent-teal hover:underline">
                Mark read
              </button>
            )}
            <button onClick={() => remove(n._id)}
              className="text-text-muted-light hover:text-accent-red">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
