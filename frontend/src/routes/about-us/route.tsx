import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { CornerPillBadge } from "@/components/brand/CornerPillBadge";
import { useState } from "react";
import {
  ArrowRight,
  Target,
  Compass,
  Users,
  Calendar,
  Zap,
  ChevronLeft,
  Menu,
  X,
  LayoutDashboard,
  LogIn,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBell } from "@/components/layout/NotificationBell";

export const Route = createFileRoute("/about-us")({
  ssr: false,
  component: AboutUsPage,
});

const getInitials = (name: string) => {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

function AboutUsPage() {
  const { user, logout } = useAuth();
  const { accessToken } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleJoinGD = () => {
    navigate({ to: "/upcoming-gds" });
  };

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/auth/login" });
  };

  const team = [
    {
      name: "Raj Girase",
      role: "CEO",
      avatar: "/team/raj.jpg",
      bullets: ["Strategy & leadership", "Finance", "Execution"],
    },
    {
      name: "Kulvansh Rajput",
      role: "CTO",
      avatar: "/team/kulvansh.jpg",
      bullets: ["Platform development", "Technology integration", "Maintenance & scaling"],
    },
    {
      name: "Sneha",
      role: "CMO",
      avatar: "/team/sneha.jpg",
      bullets: ["Marketing strategy", "Brand growth", "Onboarding"],
    },
    {
      name: "Manas",
      role: "Operations",
      avatar: "/team/manas.jpg",
      bullets: ["Daily operations", "Session management", "Coordination"],
    },
  ];

  return (
    <div className="min-h-screen bg-bg-dark text-text-on-dark selection:bg-accent-teal/30 select-none">
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
            <Link to="/upcoming-gds" className="hover:text-text-on-dark transition">Upcoming GDs</Link>
            <Link to="/about-us" className="text-accent-teal font-semibold transition">About Us</Link>
            <a href="/#how-it-works" className="hover:text-text-on-dark transition">How it works</a>
            <a href="/#mentors" className="hover:text-text-on-dark transition">Meet Mentors</a>
            <a href="/#faq" className="hover:text-text-on-dark transition">FAQ</a>
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
                <a href="/#faq" onClick={() => setMenuOpen(false)} className="hover:text-text-on-dark transition">FAQ</a>
              </nav>
            </div>
          </div>
        )}
      </header>

      {/* ─── Hero Section ─── */}
      <section className="relative min-h-[45vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "linear-gradient(rgba(5, 8, 17, 0.75), rgba(5, 8, 17, 0.95)), url('https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80')" }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.15),transparent_65%)] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="mb-4">
            <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-text-muted-dark hover:text-white transition">
              <ChevronLeft className="h-3.5 w-3.5" /> Back to Home
            </Link>
          </div>
          <h1 className="font-display text-4xl sm:text-6xl font-bold text-white tracking-tight leading-tight">
            Our <span className="text-gradient-teal font-extrabold font-display">Story</span>
          </h1>
          <p className="text-base sm:text-xl text-text-muted-dark max-w-xl mx-auto leading-relaxed font-sans">
            From struggling in GDs to building confidence in students.
          </p>
        </div>
      </section>

      {/* ─── Background Section ─── */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-accent-teal to-accent-teal-bright rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000" />
              <img
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80"
                alt="Student Collaboration"
                className="relative rounded-2xl border border-white/10 shadow-elegant w-full object-cover aspect-[4/3] transform transition duration-500 hover:scale-[1.01]"
              />
            </div>
            <div className="lg:col-span-6 text-left space-y-6">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Background
              </h2>
              <div className="h-1 w-20 bg-gradient-teal rounded" />
              <div className="space-y-4 text-base sm:text-lg text-text-muted-dark leading-relaxed font-sans">
                <p>
                  Many students fail placements not because of lack of knowledge, but due to poor communication skills, stage fear, and lack of structured Group Discussion exposure.
                </p>
                <p>
                  PrepLyt was built to bridge this critical gap. By offering live, mentored group discussions, customizable scoring rubrics, and detailed individual scorecards, we empower students to transform their communication skills from a weakness to a superpower.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Mission & Vision ─── */}
      <section className="py-20 bg-surface-dark-2/40 border-y border-white/5 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(20,184,166,0.05),transparent_40%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-surface-dark-2/60 border border-white/5 rounded-2xl p-8 hover:border-accent-teal/30 transition shadow-elegant text-left space-y-4">
            <div className="h-12 w-12 rounded-xl bg-accent-teal/10 flex items-center justify-center text-accent-teal">
              <Target className="h-6 w-6" />
            </div>
            <h3 className="font-display text-2xl font-bold text-white">Our Mission</h3>
            <p className="text-sm sm:text-base text-text-muted-dark leading-relaxed font-sans">
              To make students confident, articulate, and placement-ready through practical learning, consistent feedback, and real-world evaluation rubrics.
            </p>
          </div>
          <div className="bg-surface-dark-2/60 border border-white/5 rounded-2xl p-8 hover:border-accent-teal/30 transition shadow-elegant text-left space-y-4">
            <div className="h-12 w-12 rounded-xl bg-accent-teal/10 flex items-center justify-center text-accent-teal">
              <Compass className="h-6 w-6" />
            </div>
            <h3 className="font-display text-2xl font-bold text-white">Our Vision</h3>
            <p className="text-sm sm:text-base text-text-muted-dark leading-relaxed font-sans">
              To become India's leading Group Discussion learning and preparation platform, setting the benchmark for communication evaluation in higher education and corporations.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Growing Impact ─── */}
      <section className="py-20 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="space-y-3">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">Our Growing Impact</h2>
            <p className="text-text-muted-dark font-sans max-w-xl mx-auto">Driving consistent improvement across institutes and communities.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { val: "50+", label: "Students Enabled", icon: Users },
              { val: "10+", label: "Sessions Hosted", icon: Calendar },
              { val: "100%", label: "Practical Learning", icon: Zap },
              { val: "Growing", label: "Community", icon: Users },
            ].map((stat, i) => {
              const IconComp = stat.icon;
              return (
                <div key={i} className="bg-surface-dark/40 border border-white/5 rounded-2xl p-6 hover:border-accent-teal/30 transition shadow-elegant flex flex-col items-center">
                  <div className="text-gradient-teal text-4xl sm:text-5xl font-black font-sans tracking-tight mb-2">
                    {stat.val}
                  </div>
                  <div className="text-xs sm:text-sm text-text-muted-dark font-semibold uppercase tracking-wider font-sans">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Core Team ─── */}
      <section className="py-20 bg-surface-dark-2/40 border-t border-white/5 text-center relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="space-y-4 max-w-2xl mx-auto">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">Our Core Team</h2>
            <p className="text-sm sm:text-base text-text-muted-dark leading-relaxed font-sans">
              A passionate team working together to build a platform that transforms communication skills and prepares students for real-world placement success.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member, i) => (
              <div key={i} className="bg-bg-dark border border-white/5 rounded-2xl p-6 hover:border-accent-teal/40 transition-all duration-300 hover:-translate-y-1.5 shadow-elegant flex flex-col items-center">
                <div className="relative mb-5 group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-accent-teal to-accent-teal-bright rounded-full blur-md opacity-20 group-hover:opacity-40 transition" />
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="relative w-24 h-24 rounded-full object-cover border-2 border-accent-teal/60"
                  />
                </div>
                <h3 className="font-display text-xl font-bold text-white mb-1">{member.name}</h3>
                <span className="text-accent-teal font-semibold text-xs uppercase tracking-wider mb-4 font-sans">{member.role}</span>
                <ul className="text-xs text-text-muted-dark space-y-1.5 text-center font-sans border-t border-white/5 pt-4 w-full">
                  {member.bullets.map((b, idx) => (
                    <li key={idx} className="flex justify-center items-center gap-1.5">
                      <span className="h-1 w-1 bg-accent-teal rounded-full" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.1),transparent_50%)] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-white leading-tight">
            Join Our <span className="text-gradient-teal font-extrabold font-display">Journey</span>
          </h2>
          <p className="text-sm sm:text-lg text-text-muted-dark max-w-xl mx-auto leading-relaxed font-sans">
            Ready to experience a live debrief and take your communication skills to the next level? Sign up or register for a slot today.
          </p>
          <div className="pt-4">
            <Button onClick={handleJoinGD} className="bg-accent-teal hover:bg-accent-teal-bright text-white shadow-glow-teal px-8 py-6 text-base font-semibold">
              Join Live GD <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/5 bg-bg-dark py-12">
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
