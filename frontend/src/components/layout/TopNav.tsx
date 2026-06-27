import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useSidebarStore } from "@/lib/sidebar-store";
import { CornerPillBadge } from "@/components/brand/CornerPillBadge";
import { NotificationBell } from "./NotificationBell";
import { LogOut, Menu } from "lucide-react";

const getInitials = (name: string) => {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export function TopNav() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { toggleMobile } = useSidebarStore();

  const onLogout = async () => {
    await logout();
    router.navigate({ to: "/auth/login" });
  };

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-bg-dark/85 text-text-on-dark border-b border-hairline-dark">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {user && (
            <button
              onClick={toggleMobile}
              className="p-2 -ml-2 rounded-lg text-text-muted-dark hover:text-text-on-dark hover:bg-surface-dark md:hidden transition cursor-pointer"
              title="Toggle menu"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-teal flex items-center justify-center font-display text-base font-bold text-white shadow-glow-teal">
              GD
            </div>
            <span className="font-display text-lg tracking-tight">
              Preplyt <span className="text-gradient-teal font-semibold">GD</span>
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <CornerPillBadge tone="teal">{user.role}</CornerPillBadge>
          )}
          <NotificationBell />
          {user && (
            <Link
              to="/dashboard"
              className="h-8 w-8 rounded-full overflow-hidden flex items-center justify-center border border-hairline-dark bg-surface-dark hover:border-accent-teal transition cursor-pointer"
              title="Dashboard"
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-xs font-bold text-text-on-dark font-display">
                  {getInitials(user.name)}
                </span>
              )}
            </Link>
          )}
          <button
            onClick={onLogout}
            className="p-2 rounded-lg text-text-muted-dark hover:text-text-on-dark hover:bg-surface-dark transition"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
