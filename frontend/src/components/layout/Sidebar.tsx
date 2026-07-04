import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useSidebarStore } from "@/lib/sidebar-store";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Bell,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  X,
  ShieldCheck,
  FolderKanban,
  Building2,
  BarChart3,
} from "lucide-react";

export function Sidebar() {
  const { role } = useAuth();
  const loc = useLocation();
  const { isCollapsed, toggleCollapsed, isOpenMobile, closeMobile } = useSidebarStore();

  const items = [
    { to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { to: "/sessions", label: "Sessions", Icon: Users },
    ...(role === "instructor" || role === "admin"
      ? [{ to: "/templates", label: "Templates", Icon: ClipboardList }]
      : []),
    ...(role === "admin"
      ? [
          {to: "/admin/instructors", label: "Verify Instructors", Icon: ShieldCheck},
          {to: "/admin/instructor-gds", label: "Instructor GDs", Icon: FolderKanban},
          {to: "/admin/b2b-requests", label: "B2B Requests", Icon: Building2},
          {to: "/admin/analytics", label: "Feedback Analytics", Icon: BarChart3},
        ]
      : []),
    { to: "/notifications", label: "Notifications", Icon: Bell },
    { to: "/profile", label: "Profile", Icon: UserIcon },
  ];

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile, visible on desktop) */}
      <aside
        className={cn(
          "bg-bg-dark text-text-on-dark min-h-[calc(100vh-4rem)] py-6 px-3 border-r border-hairline-dark flex-col transition-all duration-300 relative shrink-0 w-64",
          isCollapsed ? "hidden" : "hidden md:flex"
        )}
      >
        <div
          className={cn(
            "px-3 mb-4 text-[10px] uppercase tracking-[0.18em] text-text-muted-dark transition-opacity duration-200 truncate",
            isCollapsed ? "opacity-0" : "opacity-100"
          )}
        >
          Workspace
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {items.map(({ to, label, Icon }) => {
            const active = loc.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "group relative flex items-center py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isCollapsed ? "justify-center px-0" : "pl-4 pr-3",
                  active
                    ? "bg-surface-dark text-text-on-dark"
                    : "text-text-muted-dark hover:bg-surface-dark/60 hover:text-text-on-dark",
                )}
                title={isCollapsed ? label : undefined}
              >
                <span
                  className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full transition-all",
                    active
                      ? "bg-accent-teal-bright shadow-[0_0_12px_rgba(20,184,166,0.7)]"
                      : "bg-transparent",
                  )}
                />
                <Icon
                  className={cn(
                    "h-4 w-4 transition-colors shrink-0",
                    active
                      ? "text-accent-teal-bright"
                      : "text-text-muted-dark group-hover:text-text-on-dark",
                    !isCollapsed && "mr-3"
                  )}
                />
                <span
                  className={cn(
                    "transition-opacity duration-250 truncate",
                    isCollapsed ? "opacity-0 w-0 overflow-hidden hidden" : "opacity-100"
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}

          {/* Desktop Toggle Button */}
          <button
            onClick={toggleCollapsed}
            className={cn(
              "mt-auto flex items-center py-2.5 rounded-lg text-sm font-medium text-text-muted-dark hover:bg-surface-dark/60 hover:text-text-on-dark transition-all duration-200 cursor-pointer",
              isCollapsed ? "justify-center" : "pl-4 pr-3"
            )}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 shrink-0 mr-3" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </nav>
      </aside>

      {/* Mobile Sidebar Drawer (overlay) */}
      <div
        className={cn(
          "md:hidden fixed inset-0 z-40 transition-opacity duration-300",
          isOpenMobile ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Dark backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={closeMobile}
        />

        {/* Sidebar container */}
        <aside
          className={cn(
            "absolute inset-y-0 left-0 w-64 bg-bg-dark text-text-on-dark p-6 border-r border-hairline-dark flex flex-col transition-transform duration-300 z-50",
            isOpenMobile ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Header area with close button */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-[10px] uppercase tracking-[0.18em] text-text-muted-dark">
              Workspace
            </span>
            <button
              onClick={closeMobile}
              className="p-1 rounded-lg text-text-muted-dark hover:text-white hover:bg-surface-dark transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 flex-1">
            {items.map(({ to, label, Icon }) => {
              const active = loc.pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={closeMobile}
                  className={cn(
                    "group relative flex items-center py-2.5 pl-4 pr-3 rounded-lg text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-surface-dark text-text-on-dark"
                      : "text-text-muted-dark hover:bg-surface-dark/60 hover:text-text-on-dark",
                  )}
                >
                  <span
                    className={cn(
                      "absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full transition-all",
                      active
                        ? "bg-accent-teal-bright shadow-[0_0_12px_rgba(20,184,166,0.7)]"
                        : "bg-transparent",
                    )}
                  />
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-colors shrink-0 mr-3",
                      active
                        ? "text-accent-teal-bright"
                        : "text-text-muted-dark group-hover:text-text-on-dark",
                    )}
                  />
                  <span className="truncate">{label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
      </div>
    </>
  );
}
