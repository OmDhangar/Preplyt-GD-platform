import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Footer } from "@/components/layout/Footer";
import { useAuthStore } from "@/lib/auth-store";
import { apiGet } from "@/lib/api";
import type { Session } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { CornerPillBadge } from "@/components/brand/CornerPillBadge";
import { useState } from "react";
import {
  Calendar,
  Clock,
  ArrowRight,
  User,
  Tag,
  CreditCard,
  ChevronLeft,
  Menu,
  X,
  LayoutDashboard,
  LogIn,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBell } from "@/components/layout/NotificationBell";

export const Route = createFileRoute("/upcoming-gds")({
  ssr: false,
  component: PublicUpcomingGdsPage,
});

const getInitials = (name: string) => {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

function PublicUpcomingGdsPage() {
  const { user, logout } = useAuth();
  const { accessToken } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/auth/login" });
  };

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["public-upcoming-sessions"],
    queryFn: async () => {
      const resp = await apiGet<Session[]>("/sessions/public/upcoming");
      return resp.data || [];
    },
  });

  const handleRegister = (joinCode: string) => {
    if (accessToken) {
      navigate({ to: "/sessions/join/$code", params: { code: joinCode } });
    } else {
      navigate({
        to: "/auth/login",
        search: { redirect: `/sessions/join/${joinCode}` },
      });
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark text-text-on-dark selection:bg-accent-teal/30 select-none flex flex-col justify-between">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-50 bg-bg-dark md:bg-bg-dark/90 md:backdrop-blur-xl text-text-on-dark border-b border-hairline-dark transition-all">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 -ml-2 rounded-lg text-text-muted-dark hover:text-text-on-dark hover:bg-surface-dark transition cursor-pointer"
              title="Toggle menu"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-full bg-gradient-teal flex items-center justify-center font-display text-base font-bold text-white shadow-glow-teal shrink-0">
                PL
              </div>
              <span className="hidden sm:inline-block font-display text-lg tracking-tight">
                Preplyt <span className="text-gradient-teal font-semibold">PL</span>
              </span>
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-text-muted-dark">
            <Link to="/" className="hover:text-text-on-dark transition">Home</Link>
            <Link to="/upcoming-gds" className="text-accent-teal font-semibold transition">Upcoming GDs</Link>
            <Link to="/about-us" className="hover:text-text-on-dark transition">About Us</Link>
            <a href="/#how-it-works" className="hover:text-text-on-dark transition">How it works</a>
            <a href="/#mentors" className="hover:text-text-on-dark transition">Meet Mentors</a>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {user.role && (
                  <CornerPillBadge tone="teal" className="hidden sm:inline-flex">{user.role}</CornerPillBadge>
                )}
                <NotificationBell />
                <Link
                  to="/dashboard"
                  className="h-8 w-8 rounded-full overflow-hidden flex items-center justify-center border border-hairline-dark bg-surface-dark hover:border-accent-teal transition cursor-pointer shrink-0"
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
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-text-muted-dark hover:text-text-on-dark hover:bg-surface-dark transition cursor-pointer"
                  title="Log out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <Link to="/auth/login">
                <Button variant="outline" className="border-white/10 hover:border-white/20 text-white bg-white/5 hover:bg-white/10 px-3 py-3 sm:px-5 sm:py-5 text-sm font-medium flex items-center justify-center gap-2">
                  <span className="hidden sm:inline">Login / Register</span>
                  <LogIn className="h-4 w-4 shrink-0 sm:hidden" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {menuOpen && (
          <div className="fixed inset-0 z-50 flex justify-end md:hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />
            {/* Drawer */}
            <div className="relative w-64 max-w-xs bg-bg-dark h-full p-6 border-l border-hairline-dark flex flex-col gap-6 text-left shadow-2xl animate-in slide-in-from-right duration-200">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-white text-lg">Menu</span>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-1 rounded-lg text-text-muted-dark hover:text-text-on-dark hover:bg-surface-dark cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex flex-col gap-4 text-base font-medium text-text-muted-dark">
                <Link to="/" onClick={() => setMenuOpen(false)} className="hover:text-text-on-dark transition">Home</Link>
                <Link to="/upcoming-gds" onClick={() => setMenuOpen(false)} className="hover:text-text-on-dark transition">Upcoming GDs</Link>
                <Link to="/about-us" onClick={() => setMenuOpen(false)} className="hover:text-text-on-dark transition">About Us</Link>
                <a href="/#how-it-works" onClick={() => setMenuOpen(false)} className="hover:text-text-on-dark transition">How it works</a>
                <a href="/#mentors" onClick={() => setMenuOpen(false)} className="hover:text-text-on-dark transition">Meet Mentors</a>
              </nav>
            </div>
          </div>
        )}
      </header>

      {/* ─── Main Content ─── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 flex items-center gap-2">
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-text-muted-dark hover:text-white transition">
            <ChevronLeft className="h-3.5 w-3.5" /> Back to Home
          </Link>
        </div>

        <div className="space-y-4 mb-12 text-left">
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
            Explore <span className="text-gradient-teal font-extrabold">Group Discussions</span>
          </h1>
          <p className="text-base sm:text-lg text-text-muted-dark max-w-2xl leading-relaxed">
            Browse and secure slots for our live, moderated debate sessions. Register on the platform to join the discussion and receive direct rubric feedback and scorecards.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-surface-dark/40 border border-white/5 rounded-2xl p-6 space-y-4 animate-pulse">
                <div className="h-4 bg-white/10 rounded w-1/3" />
                <div className="h-6 bg-white/10 rounded w-3/4" />
                <div className="h-4 bg-white/10 rounded w-5/6" />
                <div className="h-10 bg-white/10 rounded-xl w-full mt-6" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(sessions || []).map((s) => (
              <div
                key={s._id}
                className="bg-surface-dark/40 border border-white/5 rounded-2xl p-6 flex flex-col justify-between hover:border-accent-teal/40 transition duration-300 shadow-xl relative"
              >
                <div className="space-y-4 text-left">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${s.status === "active"
                      ? "bg-accent-teal/10 text-accent-teal"
                      : s.status === "completed"
                        ? "bg-white/10 text-text-muted-dark"
                        : "bg-amber-500/10 text-amber-500"
                      }`}>
                      {s.status === "active" ? "LIVE NOW" : s.status === "completed" ? "Completed" : "Upcoming"}
                    </span>
                    <CornerPillBadge tone={s.requiresPayment ? "amber" : "teal"}>
                      {s.requiresPayment && s.sessionFee ? `${s.sessionFee.currency} ${s.sessionFee.amount}` : "Free"}
                    </CornerPillBadge>
                  </div>

                  {s.posterUrl && (
                    <div className="w-full h-40 rounded-xl overflow-hidden mb-4 border border-white/10 shrink-0">
                      <img src={s.posterUrl} alt={s.title} className="w-full h-full object-cover animate-fade-in" />
                    </div>
                  )}

                  <div className="space-y-1">
                    <h3 className="font-display font-bold text-xl text-white line-clamp-1">
                      {s.title}
                    </h3>
                    {s.topic && (
                      <p className="text-xs text-accent-teal font-medium line-clamp-1">
                        Topic: {s.topic}
                      </p>
                    )}
                  </div>

                  {s.description && (
                    <p className="text-sm text-text-muted-dark line-clamp-2 leading-relaxed">
                      {s.description}
                    </p>
                  )}

                  <div className="text-xs text-text-muted-dark space-y-2 pt-2 border-t border-white/5">
                    {s.scheduledAt && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-accent-teal" />
                        <span>{new Date(s.scheduledAt).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-accent-teal" />
                      <span>{s.durationMins || 30} Mins Duration</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-accent-teal" />
                      <span>Facilitator: {s.instructorId?.name || "Expert Mentor"}</span>
                    </div>
                    {s.tags && s.tags.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <Tag className="h-3 w-3 text-accent-teal shrink-0" />
                        <div className="flex gap-1 flex-wrap">
                          {s.tags.map((tag: string) => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/70">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-white/5">
                  {s.status === "completed" ? (
                    <Button
                      disabled
                      className="w-full bg-white/5 text-white/30 border border-white/5 cursor-not-allowed font-semibold py-5"
                    >
                      Completed
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleRegister(s.joinCode || "")}
                      className="w-full bg-accent-teal hover:bg-accent-teal-bright text-white shadow-glow-teal font-semibold py-5 cursor-pointer"
                    >
                      Register to Join
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {!sessions?.length && (
              <div className="col-span-full text-center py-16 bg-surface-dark/20 border border-white/5 border-dashed rounded-2xl">
                <p className="text-text-muted-dark">No live or upcoming GD sessions currently scheduled.</p>
                <Link to="/" className="text-accent-teal hover:underline text-sm font-semibold mt-2 inline-block">
                  Return to Home
                </Link>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ─── Footer ─── */}
      <Footer />
    </div>
  );
}
