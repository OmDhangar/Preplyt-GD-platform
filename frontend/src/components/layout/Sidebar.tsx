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
} from "lucide-react";

export function Sidebar() {
  const { role } = useAuth();
  const loc = useLocation();
  const { isCollapsed, isOpenMobile, toggleCollapsed, closeMobile } = useSidebarStore();

  const items = [
    { to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { to: "/sessions", label: "Sessions", Icon: Users },
    ...(role === "instructor" || role === "admin"
      ? [{ to: "/templates", label: "Templates", Icon: ClipboardList }]
      : []),
    ...(role === "admin"
      ? [
          { to: "/admin/instructors", label: "Verify Instructors", Icon: ShieldCheck },
          { to: "/admin/instructor-gds", label: "Instructor GDs", Icon: FolderKanban },
          { to: "/admin/b2b-requests", label: "B2B Requests", Icon: Building2 },
        ]
      : []),
    { to: "/notifications", label: "Notifications", Icon: Bell },
    { to: "/profile", label: "Profile", Icon: UserIcon },
  ];


  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={cn(
          "bg-bg-dark text-text-on-dark min-h-[calc(100vh-4rem)] py-6 px-3 border-r border-hairline-dark flex flex-col transition-all duration-300",
          // Mobile drawer styling
          "fixed inset-y-0 left-0 z-50 w-64 transform md:translate-x-0 md:relative md:z-auto",
          isOpenMobile ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          // Desktop collapse state styling
          isCollapsed ? "md:w-16" : "md:w-64"
        )}
      >
        {/* Mobile Close Button */}
        <div className="flex md:hidden justify-end mb-4 px-2">
          <button
            onClick={closeMobile}
            className="p-1.5 rounded-lg text-text-muted-dark hover:text-text-on-dark hover:bg-surface-dark transition cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className={cn(
            "px-3 mb-4 text-[10px] uppercase tracking-[0.18em] text-text-muted-dark transition-opacity duration-200 truncate",
            isCollapsed ? "md:opacity-0" : "opacity-100"
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
                onClick={closeMobile}
                className={cn(
                  "group relative flex items-center py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isCollapsed ? "md:justify-center md:px-0" : "pl-4 pr-3",
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
                    isCollapsed ? "md:opacity-0 md:w-0 md:overflow-hidden md:hidden" : "opacity-100"
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
              "mt-auto hidden md:flex items-center py-2.5 rounded-lg text-sm font-medium text-text-muted-dark hover:bg-surface-dark/60 hover:text-text-on-dark transition-all duration-200 cursor-pointer",
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
    </>
  );
}
