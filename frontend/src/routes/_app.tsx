import { createFileRoute, Outlet, redirect, useHydrated } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/auth-store";
import { TopNav } from "@/components/layout/TopNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { AlertCircle, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_app")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const { accessToken } = useAuthStore.getState();
    if (!accessToken) {
      throw redirect({ to: "/auth/login" });
    }
  },
  component: AppShell,
});

function AppShell() {
  const isHydrated = useHydrated();
  const { user, role } = useAuth();

  if (!isHydrated) {
    return null;
  }

  const showPendingBanner = role === "instructor" && user?.verificationStatus === "pending";
  const showRejectedBanner = role === "instructor" && user?.verificationStatus === "rejected";

  return (
    <div className="min-h-screen bg-bg-light">
      <TopNav />
      
      {showPendingBanner && (
        <div className="bg-amber-500 text-white px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium shadow-md transition-all">
          <ShieldAlert className="h-4 w-4 shrink-0 animate-pulse" />
          <span>Your instructor account is pending administrator verification. Some features will be restricted until approved.</span>
        </div>
      )}

      {showRejectedBanner && (
        <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium shadow-md transition-all">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            Your instructor account verification was rejected. Reason:{" "}
            <strong>{user?.rejectionReason || "No reason provided."}</strong>. Please update your profile details or contact support.
          </span>
        </div>
      )}

      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-w-0 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
