import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth-store";
import { apiGet } from "@/lib/api";
import type { Session } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { CornerPillBadge } from "@/components/brand/CornerPillBadge";
import {
  Calendar,
  Clock,
  ArrowRight,
  User,
  Tag,
  CreditCard,
  ChevronLeft,
} from "lucide-react";

export const Route = createFileRoute("/upcoming-gds")({
  ssr: false,
  component: PublicUpcomingGdsPage,
});

function PublicUpcomingGdsPage() {
  const { accessToken } = useAuthStore();
  const navigate = useNavigate();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["public-upcoming-sessions"],
    queryFn: async () => {
      const resp = await apiGet<{ sessions: Session[] }>("/sessions/public/upcoming");
      return resp.data.sessions || [];
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
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-bg-dark/80 border-b border-white/5 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-teal flex items-center justify-center font-display text-base font-bold text-white shadow-glow-teal">
              PL
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-white">
              Prep<span className="text-gradient-teal font-extrabold">Lyt</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
            <Link to="/" className="hover:text-white transition">Home</Link>
            <Link to="/upcoming-gds" className="text-accent-teal font-semibold transition">Upcoming GDs</Link>
            <a href="/#how-it-works" className="hover:text-white transition">How it works</a>
            <a href="/#mentors" className="hover:text-white transition">Meet Mentors</a>
          </nav>
          <div>
            {accessToken ? (
              <Link to="/dashboard">
                <Button className="bg-accent-teal hover:bg-accent-teal-bright text-white shadow-glow-teal px-5 py-5 text-sm font-medium">
                  Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link to="/auth/login">
                <Button variant="outline" className="border-white/10 hover:border-white/20 text-white bg-white/5 hover:bg-white/10 px-5 py-5 text-sm font-medium">
                  Login / Register
                </Button>
              </Link>
            )}
          </div>
        </div>
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
                    <span className="px-2 py-0.5 rounded bg-accent-teal/10 text-accent-teal text-[10px] font-bold uppercase tracking-wider">
                      {s.status === "active" ? "LIVE NOW" : "Upcoming"}
                    </span>
                    <CornerPillBadge tone={s.requiresPayment ? "amber" : "teal"}>
                      {s.requiresPayment && s.sessionFee ? `${s.sessionFee.currency} ${s.sessionFee.amount}` : "Free"}
                    </CornerPillBadge>
                  </div>

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
                  <Button
                    onClick={() => handleRegister(s.joinCode || "")}
                    className="w-full bg-accent-teal hover:bg-accent-teal-bright text-white shadow-glow-teal font-semibold py-5 cursor-pointer"
                  >
                    Register to Join
                  </Button>
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
      <footer className="border-t border-white/5 bg-bg-dark py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-teal flex items-center justify-center font-display text-sm font-bold text-white shadow-glow-teal">
              PL
            </div>
            <span className="font-display font-bold text-base tracking-tight text-white">
              Prep<span className="text-gradient-teal font-extrabold">Lyt</span>
            </span>
          </div>
          <div className="text-xs text-text-muted-dark font-medium">
            © {new Date().getFullYear()} PrepLyt. All rights reserved. Moderated live group discussion software.
          </div>
        </div>
      </footer>
    </div>
  );
}
