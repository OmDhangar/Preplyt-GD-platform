import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { apiPost, ApiError } from "@/lib/api";
import {
  ArrowRight,
  Sparkles,
  Calendar,
  Users,
  Award,
  Zap,
  Building,
  CheckCircle,
  Phone,
  Mail,
  User,
  GraduationCap,
  MapPin,
  ChevronLeft,
} from "lucide-react";

export const Route = createFileRoute("/b2b")({
  ssr: false,
  component: B2bPage,
});

function B2bPage() {
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [college, setCollege] = useState("");
  const [city, setCity] = useState("");
  const [students, setStudents] = useState<number | "">("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiPost("/b2b-requests", {
        name,
        designation,
        college,
        city,
        students: Number(students),
        phone,
        email,
      });

      setSubmitted(true);
      toast.success("Pilot request submitted successfully!");
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark text-text-on-dark selection:bg-accent-teal/30 select-none">
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
            <Link to="/upcoming-gds" className="hover:text-accent-teal transition">Upcoming GDs</Link>
            <Link to="/about-us" className="hover:text-accent-teal transition">About Us</Link>
            <a href="/#how-it-works" className="hover:text-accent-teal transition">How it works</a>
            <a href="/#mentors" className="hover:text-accent-teal transition">Meet Mentors</a>
            <a href="/#faq" className="hover:text-accent-teal transition">FAQ</a>
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

      {/* ─── Hero Section ─── */}
      <section className="relative pt-16 pb-20 lg:pt-28 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.15),transparent_45%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 flex flex-col items-center">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-text-muted-dark hover:text-white transition mb-2">
            <ChevronLeft className="h-3.5 w-3.5" /> Back to Home
          </Link>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-teal/10 border border-accent-teal/20 text-accent-teal text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" /> FOR PLACEMENT OFFICERS & TPOs
          </div>

          <h1 className="font-display text-4xl sm:text-6xl font-bold text-white tracking-tight leading-[1.1] max-w-4xl">
            Help your students crack GDs & PIs<br />
            <span className="text-gradient-teal font-extrabold">&mdash; before placement season.</span>
          </h1>

          <p className="text-base sm:text-lg text-text-muted-dark max-w-2xl leading-relaxed">
            Live sessions with IIT & JBIMS alumni mentors. Structured feedback. For batches of 10 to 500+. Zero setup required.
          </p>

          <div className="pt-4">
            <a href="#pilot-form">
              <Button className="bg-accent-teal hover:bg-accent-teal-bright text-white shadow-glow-teal px-8 py-6 text-base font-semibold">
                Request a Pilot Session
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ─── Benefits Section ─── */}
      <section className="py-20 bg-surface-dark/30 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-16">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-teal/10 border border-accent-teal/20 text-accent-teal text-xs font-semibold uppercase tracking-wider">
              WHAT INSTITUTES GET
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">
              Engineered for Placement Excellence
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-surface-dark/40 border border-white/5 rounded-2xl p-8 space-y-4 hover:border-accent-teal/20 transition text-left group">
              <div className="h-12 w-12 rounded-xl bg-accent-teal/10 flex items-center justify-center text-accent-teal group-hover:scale-110 transition-transform">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="font-display font-semibold text-lg text-white">Batch sessions on your calendar</h3>
              <p className="text-sm text-text-muted-dark leading-relaxed">
                GD + PI batches scheduled dynamically around your specific college placement timeline.
              </p>
            </div>

            <div className="bg-surface-dark/40 border border-white/5 rounded-2xl p-8 space-y-4 hover:border-accent-teal/20 transition text-left group">
              <div className="h-12 w-12 rounded-xl bg-accent-teal/10 flex items-center justify-center text-accent-teal group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="font-display font-semibold text-lg text-white">Industry mentor-led feedback</h3>
              <p className="text-sm text-text-muted-dark leading-relaxed">
                Every single student reviewed live by a working industry professional, not a generic coach.
              </p>
            </div>

            <div className="bg-surface-dark/40 border border-white/5 rounded-2xl p-8 space-y-4 hover:border-accent-teal/20 transition text-left group">
              <div className="h-12 w-12 rounded-xl bg-accent-teal/10 flex items-center justify-center text-accent-teal group-hover:scale-110 transition-transform">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="font-display font-semibold text-lg text-white">Per-student progress reports</h3>
              <p className="text-sm text-text-muted-dark leading-relaxed">
                Granular written feedback, criteria scores, and rubrics generated automatically after each session.
              </p>
            </div>

            <div className="bg-surface-dark/40 border border-white/5 rounded-2xl p-8 space-y-4 hover:border-accent-teal/20 transition text-left group">
              <div className="h-12 w-12 rounded-xl bg-accent-teal/10 flex items-center justify-center text-accent-teal group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="font-display font-semibold text-lg text-white">Flexible batch size</h3>
              <p className="text-sm text-text-muted-dark leading-relaxed">
                From small groups of 10 to major campus batches of 500+ students. One classroom or the whole campus.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Form Section ─── */}
      <section id="pilot-form" className="py-20 lg:py-32 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(20,184,166,0.1),transparent_50%)] pointer-events-none" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="relative bg-surface-dark border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent-teal/10 rounded-full blur-xl pointer-events-none" />
            
            <div className="text-center space-y-4 mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-teal/10 border border-accent-teal/20 text-accent-teal text-xs font-semibold uppercase tracking-wider">
                Pilot Program &bull; Free for up to 20 students
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-white">
                Request a <span className="text-gradient-teal font-extrabold">pilot session.</span>
              </h2>
              <p className="text-sm text-text-muted-dark max-w-md mx-auto">
                Tell us about your batch. We will get back to you within 24 hours.
              </p>
            </div>

            {submitted ? (
              <div className="text-center py-12 space-y-6 animate-fade-in">
                <div className="mx-auto w-16 h-16 rounded-full bg-accent-teal/20 border border-accent-teal/30 flex items-center justify-center text-accent-teal-bright shadow-glow-teal">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display text-2xl font-bold text-white">Thank you!</h3>
                  <p className="text-text-muted-dark max-w-md mx-auto text-sm leading-relaxed">
                    Your request has been received. A confirmation email has been sent to <strong>{email}</strong>, and our coordinators will reach out shortly.
                  </p>
                </div>
                <div className="pt-4">
                  <Button
                    onClick={() => {
                      setSubmitted(false);
                      setName("");
                      setDesignation("");
                      setCollege("");
                      setCity("");
                      setStudents("");
                      setPhone("");
                      setEmail("");
                    }}
                    variant="outline"
                    className="border-white/10 text-white hover:bg-white/5"
                  >
                    Submit another request
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 text-left">
                    <Label htmlFor="fullName" className="text-sm font-semibold text-white/90">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted-dark" />
                      <Input
                        type="text"
                        id="fullName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Dr. Asha Menon"
                        required
                        className="pl-10 bg-bg-dark/50 border-white/10 text-white placeholder:text-text-muted-dark focus-visible:ring-accent-teal"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 text-left">
                    <Label htmlFor="designation" className="text-sm font-semibold text-white/90">Designation</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted-dark" />
                      <Input
                        type="text"
                        id="designation"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        placeholder="TPO / Placement Head"
                        required
                        className="pl-10 bg-bg-dark/50 border-white/10 text-white placeholder:text-text-muted-dark focus-visible:ring-accent-teal"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 text-left">
                    <Label htmlFor="college" className="text-sm font-semibold text-white/90">College Name</Label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted-dark" />
                      <Input
                        type="text"
                        id="college"
                        value={college}
                        onChange={(e) => setCollege(e.target.value)}
                        placeholder="St. Xavier's, Mumbai"
                        required
                        className="pl-10 bg-bg-dark/50 border-white/10 text-white placeholder:text-text-muted-dark focus-visible:ring-accent-teal"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 text-left">
                    <Label htmlFor="city" className="text-sm font-semibold text-white/90">City</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted-dark" />
                      <Input
                        type="text"
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Mumbai"
                        required
                        className="pl-10 bg-bg-dark/50 border-white/10 text-white placeholder:text-text-muted-dark focus-visible:ring-accent-teal"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 text-left">
                    <Label htmlFor="students" className="text-sm font-semibold text-white/90">Approx. No. of Students</Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted-dark" />
                      <Input
                        type="number"
                        id="students"
                        value={students}
                        onChange={(e) => setStudents(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="120"
                        min="1"
                        required
                        className="pl-10 bg-bg-dark/50 border-white/10 text-white placeholder:text-text-muted-dark focus-visible:ring-accent-teal"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 text-left">
                    <Label htmlFor="phone" className="text-sm font-semibold text-white/90">Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted-dark" />
                      <Input
                        type="tel"
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        required
                        className="pl-10 bg-bg-dark/50 border-white/10 text-white placeholder:text-text-muted-dark focus-visible:ring-accent-teal"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-left">
                  <Label htmlFor="email" className="text-sm font-semibold text-white/90">Work Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted-dark" />
                    <Input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tpo@college.edu.in"
                      required
                      className="pl-10 bg-bg-dark/50 border-white/10 text-white placeholder:text-text-muted-dark focus-visible:ring-accent-teal"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-accent-teal hover:bg-accent-teal-bright text-white shadow-glow-teal py-6 font-semibold"
                >
                  {loading ? "Submitting Request..." : "Request Pilot Session"}
                </Button>

                <div className="text-center text-xs text-text-muted-dark mt-4">
                  Or contact us directly at{" "}
                  <a href="mailto:preplyt1@gmail.com" className="text-accent-teal hover:text-accent-teal-bright transition underline">
                    preplyt1@gmail.com
                  </a>
                </div>
              </form>
            )}
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
