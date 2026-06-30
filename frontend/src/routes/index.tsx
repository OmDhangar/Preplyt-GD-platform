import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Users,
  Award,
  Sparkles,
  Star,
  MessageSquare,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  ssr: false,
  component: LandingPage,
});

function LandingPage() {
  const { accessToken } = useAuthStore();
  const navigate = useNavigate();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const handleJoinGD = () => {
    navigate({ to: "/upcoming-gds" });
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
            <Link to="/b2b" className="hover:text-accent-teal transition">For Institutes</Link>
            <a href="#how-it-works" className="hover:text-accent-teal transition">How it works</a>
            <a href="#mentors" className="hover:text-accent-teal transition">Meet Mentors</a>
            <a href="#faq" className="hover:text-accent-teal transition">FAQ</a>
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
      <section className="relative pt-10 pb-20 lg:pt-20 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.15),transparent_45%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-teal/10 border border-accent-teal/20 text-accent-teal text-xs font-semibold uppercase tracking-wider animate-pulse">
              <Sparkles className="h-3.5 w-3.5" /> LIVE GD Practice Session Room
            </div>
            <h1 className="font-display text-5xl sm:text-6xl font-bold text-white tracking-tight leading-[1.1]">
              Practice GDs +<br />
              Mock PIs with<br />
              <span className="text-gradient-teal font-extrabold">Industry Mentors.</span>
            </h1>
            <p className="text-base sm:text-lg text-text-muted-dark max-w-xl leading-relaxed">
              Practice Group Discussions and Mock Personal Interviews with senior business leaders. Receive real-time evaluations, customized scorecards, and structured feedback metrics.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Button onClick={handleJoinGD} className="bg-accent-teal hover:bg-accent-teal-bright text-white shadow-glow-teal px-8 py-6 text-base font-semibold">
                Join Upcoming GD
              </Button>
              <Link to="/b2b">
                <Button variant="outline" className="border-white/10 text-white bg-white/5 hover:bg-white/10 px-8 py-6 text-base font-semibold">
                  Partner with us
                </Button>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-teal/30 opacity-70 blur-xl pointer-events-none" />
            <div className="relative bg-surface-dark/70 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl space-y-6 text-left">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h3 className="font-display font-semibold text-white">Feedback Report</h3>
                  <p className="text-xs text-text-muted-dark">MBA GD Admission Practice</p>
                </div>
                <span className="px-2 py-1 rounded bg-accent-teal/20 text-accent-teal text-[10px] font-bold uppercase tracking-wider">
                  Live Status
                </span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/80">Communication Skills</span>
                    <span className="text-accent-teal font-semibold">9.0/10</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-accent-teal rounded-full" style={{ width: "90%" }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/80">Leadership & Initiative</span>
                    <span className="text-accent-teal font-semibold">8.5/10</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-accent-teal rounded-full" style={{ width: "85%" }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/80">Active Listening</span>
                    <span className="text-accent-teal font-semibold">9.5/10</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-accent-teal rounded-full" style={{ width: "95%" }}></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="text-xs text-text-muted-dark">Current Score</div>
                  <div className="text-2xl font-bold text-white mt-1">45/50</div>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="text-xs text-text-muted-dark">Confidence Level</div>
                  <div className="text-2xl font-bold text-white mt-1">92%</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ─── Stats Bar ─── */}
      <section className="bg-surface-dark border-y border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="space-y-1">
            <div className="text-4xl font-extrabold text-white">500+</div>
            <div className="text-xs text-text-muted-dark uppercase tracking-wider font-semibold">Active Students</div>
          </div>
          <div className="space-y-1">
            <div className="text-4xl font-extrabold text-white">280+</div>
            <div className="text-xs text-text-muted-dark uppercase tracking-wider font-semibold">GD Rounds Completed</div>
          </div>
          <div className="space-y-1">
            <div className="text-4xl font-extrabold text-white">4.9★</div>
            <div className="text-xs text-text-muted-dark uppercase tracking-wider font-semibold">Mentor Ratings</div>
          </div>
          <div className="space-y-1">
            <div className="text-4xl font-extrabold text-white">1074+</div>
            <div className="text-xs text-text-muted-dark uppercase tracking-wider font-semibold">Performance Reports</div>
          </div>
        </div>
      </section>

      {/* ─── How it works Section ─── */}
      <section id="how-it-works" className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-16">
          <div className="space-y-4">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">
              How it works
            </h2>
            <p className="text-text-muted-dark max-w-xl mx-auto">
              PrepLyt offers a structured approach to master Group Discussions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-surface-dark/40 border border-white/5 rounded-2xl p-8 space-y-4 hover:border-accent-teal/20 transition text-left relative overflow-hidden group">
              <div className="absolute right-6 top-6 text-6xl font-extrabold text-white/5 group-hover:text-accent-teal/5 transition">01</div>
              <div className="h-12 w-12 rounded-xl bg-accent-teal/10 flex items-center justify-center text-accent-teal">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="font-display font-semibold text-lg text-white">Book a Live Slot</h3>
              <p className="text-sm text-text-muted-dark">
                Choose from a range of upcoming topics scheduled by industry mentors. Complete payment to secure your seat.
              </p>
            </div>

            <div className="bg-surface-dark/40 border border-white/5 rounded-2xl p-8 space-y-4 hover:border-accent-teal/20 transition text-left relative overflow-hidden group">
              <div className="absolute right-6 top-6 text-6xl font-extrabold text-white/5 group-hover:text-accent-teal/5 transition">02</div>
              <div className="h-12 w-12 rounded-xl bg-accent-teal/10 flex items-center justify-center text-accent-teal">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="font-display font-semibold text-lg text-white">Participate & Perform</h3>
              <p className="text-sm text-text-muted-dark">
                Join the live Google Meet room with your peers. Take part in the discussions while your mentor moderates.
              </p>
            </div>

            <div className="bg-surface-dark/40 border border-white/5 rounded-2xl p-8 space-y-4 hover:border-accent-teal/20 transition text-left relative overflow-hidden group">
              <div className="absolute right-6 top-6 text-6xl font-extrabold text-white/5 group-hover:text-accent-teal/5 transition">03</div>
              <div className="h-12 w-12 rounded-xl bg-accent-teal/10 flex items-center justify-center text-accent-teal">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="font-display font-semibold text-lg text-white">Improve with Feedback</h3>
              <p className="text-sm text-text-muted-dark">
                Get a comprehensive scorecard with custom rubric parameters, numeric grades, and overall written feedback notes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Meet Your Mentors ─── */}
      <section id="mentors" className="py-20 bg-surface-dark/30 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-16">
          <div className="space-y-4">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">
              Meet Your Mentors
            </h2>
            <p className="text-text-muted-dark max-w-xl mx-auto">
              Our sessions are moderated by seasoned facilitators and academic experts.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-surface-dark border border-white/5 rounded-2xl p-6 space-y-4 hover:border-white/10 transition text-left">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gradient-teal overflow-hidden flex items-center justify-center text-xl font-bold text-white shadow-glow-teal">
                  AD
                </div>
                <div>
                  <h4 className="font-display font-bold text-lg text-white">Dr. Anita Desai</h4>
                  <p className="text-xs text-text-muted-dark">Associate Professor, IIM Nagpur</p>
                </div>
              </div>
              <p className="text-sm text-text-muted-dark">
                Specialist in MBA admissions and group discussion facilitation. Over 10 years of academic experience.
              </p>
              <div className="flex gap-2">
                <span className="text-[10px] px-2 py-1 rounded bg-white/5 text-white/70">GD Facilitation</span>
                <span className="text-[10px] px-2 py-1 rounded bg-white/5 text-white/70">MBA Admissions</span>
              </div>
            </div>

            <div className="bg-surface-dark border border-white/5 rounded-2xl p-6 space-y-4 hover:border-white/10 transition text-left">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gradient-teal overflow-hidden flex items-center justify-center text-xl font-bold text-white shadow-glow-teal">
                  SM
                </div>
                <div>
                  <h4 className="font-display font-bold text-lg text-white">Prof. Suresh Menon</h4>
                  <p className="text-xs text-text-muted-dark">Senior Lecturer, IIM Nagpur</p>
                </div>
              </div>
              <p className="text-sm text-text-muted-dark">
                Corporate behavior expert focusing on personality assessments and communication dynamics.
              </p>
              <div className="flex gap-2">
                <span className="text-[10px] px-2 py-1 rounded bg-white/5 text-white/70">Leadership</span>
                <span className="text-[10px] px-2 py-1 rounded bg-white/5 text-white/70">Personality</span>
              </div>
            </div>

            <div className="bg-surface-dark border border-white/5 rounded-2xl p-6 space-y-4 hover:border-white/10 transition text-left">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gradient-teal overflow-hidden flex items-center justify-center text-xl font-bold text-white shadow-glow-teal">
                  RK
                </div>
                <div>
                  <h4 className="font-display font-bold text-lg text-white">Rajesh Kumar</h4>
                  <p className="text-xs text-text-muted-dark">Soft Skills Trainer, Ex-Corporate</p>
                </div>
              </div>
              <p className="text-sm text-text-muted-dark">
                Industry-focused coach helping candidates perfect their verbal delivery and active response.
              </p>
              <div className="flex gap-2">
                <span className="text-[10px] px-2 py-1 rounded bg-white/5 text-white/70">Soft Skills</span>
                <span className="text-[10px] px-2 py-1 rounded bg-white/5 text-white/70">Interview prep</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Live GD Sessions ─── */}
      <section id="live-gds" className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-16">
          <div className="space-y-4">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">
              Upcoming Live GD Sessions
            </h2>
            <p className="text-text-muted-dark max-w-xl mx-auto">
              Book a live seat in our upcoming sessions to practice under real testing environments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-surface-dark/40 border border-white/5 rounded-2xl p-6 space-y-4 text-left relative flex flex-col justify-between">
              <div className="space-y-3">
                <span className="px-2 py-1 rounded bg-accent-teal/10 text-accent-teal text-[10px] font-bold uppercase tracking-wider">
                  Live Tomorrow
                </span>
                <h3 className="font-display font-bold text-lg text-white">Adoption of 4-day work week in India</h3>
                <p className="text-sm text-text-muted-dark">
                  Debate on corporate feasibility and work-life balance impact in the Indian context.
                </p>
                <div className="flex items-center gap-2 text-xs text-text-muted-dark mt-2">
                  <Calendar className="h-4 w-4 text-accent-teal" /> <span>30 Mins Duration</span>
                </div>
              </div>
              <div className="pt-6 border-t border-white/5 flex items-center justify-between gap-4 mt-4">
                <div>
                  <div className="text-[10px] text-text-muted-dark uppercase tracking-wider font-semibold">Session Fee</div>
                  <div className="text-2xl font-bold text-white">INR 500</div>
                </div>
                <Button onClick={handleJoinGD} className="bg-accent-teal hover:bg-accent-teal-bright text-white shadow-glow-teal font-semibold">
                  Register Now
                </Button>
              </div>
            </div>

            <div className="bg-surface-dark/40 border border-white/5 rounded-2xl p-6 space-y-4 text-left relative flex flex-col justify-between">
              <div className="space-y-3">
                <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase tracking-wider">
                  Scheduled
                </span>
                <h3 className="font-display font-bold text-lg text-white">Generative AI and White-Collar Jobs</h3>
                <p className="text-sm text-text-muted-dark">
                  Analyze if artificial intelligence acts as a tool or replacement for software & design professionals.
                </p>
                <div className="flex items-center gap-2 text-xs text-text-muted-dark mt-2">
                  <Calendar className="h-4 w-4 text-accent-teal" /> <span>40 Mins Duration</span>
                </div>
              </div>
              <div className="pt-6 border-t border-white/5 flex items-center justify-between gap-4 mt-4">
                <div>
                  <div className="text-[10px] text-text-muted-dark uppercase tracking-wider font-semibold">Session Fee</div>
                  <div className="text-2xl font-bold text-white">Free</div>
                </div>
                <Button onClick={handleJoinGD} className="bg-accent-teal hover:bg-accent-teal-bright text-white shadow-glow-teal font-semibold">
                  Join Free
                </Button>
              </div>
            </div>

            <div className="bg-surface-dark/40 border border-white/5 rounded-2xl p-6 space-y-4 text-left relative flex flex-col justify-between">
              <div className="space-y-3">
                <span className="px-2 py-1 rounded bg-accent-teal/10 text-accent-teal text-[10px] font-bold uppercase tracking-wider">
                  Live in 3 Days
                </span>
                <h3 className="font-display font-bold text-lg text-white">Is remote work the future?</h3>
                <p className="text-sm text-text-muted-dark">
                  Discussing long-term infrastructure, productivity metrics, and team collaboration in hybrid setups.
                </p>
                <div className="flex items-center gap-2 text-xs text-text-muted-dark mt-2">
                  <Calendar className="h-4 w-4 text-accent-teal" /> <span>30 Mins Duration</span>
                </div>
              </div>
              <div className="pt-6 border-t border-white/5 flex items-center justify-between gap-4 mt-4">
                <div>
                  <div className="text-[10px] text-text-muted-dark uppercase tracking-wider font-semibold">Session Fee</div>
                  <div className="text-2xl font-bold text-white">INR 300</div>
                </div>
                <Button onClick={handleJoinGD} className="bg-accent-teal hover:bg-accent-teal-bright text-white shadow-glow-teal font-semibold">
                  Register Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ Section ─── */}
      <section id="faq" className="py-20 bg-surface-dark/20 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-4">
            <h2 className="font-display text-3xl font-bold text-white">Frequently Asked Questions</h2>
            <p className="text-text-muted-dark">Everything you need to know about our evaluation process.</p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "How do I participate in a Group Discussion?",
                a: "Simply sign up as a student, browse the upcoming live GD sessions, enroll or pay if required, and check your dashboard. You will see a join code or room link to enter the live evaluation room on Google Meet.",
              },
              {
                q: "How are student results evaluated?",
                a: "Our templates evaluate core GD performance criteria like Communication, Knowledge, Listening, and Leadership. Mentors grade these live during the video call and publish final score reports.",
              },
              {
                q: "Can instructors customize the rubrics?",
                a: "Yes! Instructors get a dedicated dashboard to build custom criteria, specify weights, create evaluation templates, and even add new scoring fields in real time during evaluation.",
              },
            ].map((faq, index) => (
              <div key={index} className="bg-surface-dark/40 border border-white/5 rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 font-display font-medium text-white hover:bg-white/5 transition"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`h-4 w-4 text-text-muted-dark transition-transform ${activeFaq === index ? "rotate-180 text-accent-teal" : ""}`} />
                </button>
                {activeFaq === index && (
                  <div className="px-6 pb-6 text-sm text-text-muted-dark leading-relaxed animate-fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
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
