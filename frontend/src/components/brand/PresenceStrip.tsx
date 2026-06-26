export interface PresenceUser {
  userId: string;
  name?: string;
  deviceCount?: number;
}

export function PresenceStrip({ users }: { users: PresenceUser[] }) {
  if (!users.length)
    return (
      <div className="text-xs text-text-muted-light">No one else here</div>
    );
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-text-muted-light">
        <span className="relative inline-flex h-2 w-2">
          <span className="absolute inset-0 rounded-full bg-accent-teal-bright opacity-60 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-teal-bright" />
        </span>
        Live
      </span>
      <div className="flex -space-x-2">
        {users.slice(0, 6).map((u) => {
          const initials = (u.name || "U")
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
          return (
            <div
              key={u.userId}
              title={u.name || u.userId}
              className="h-8 w-8 rounded-full bg-gradient-teal text-white text-xs font-semibold flex items-center justify-center ring-2 ring-surface-light"
            >
              {initials}
            </div>
          );
        })}
      </div>
      {users.length > 6 && (
        <span className="text-xs text-text-muted-light">
          +{users.length - 6}
        </span>
      )}
    </div>
  );
}
