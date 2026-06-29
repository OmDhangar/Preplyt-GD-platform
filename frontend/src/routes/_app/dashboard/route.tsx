import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiGet, apiDelete } from "@/lib/api";
import { PageHeader } from "@/components/brand/PageHeader";
import { StatCard } from "@/components/brand/StatCard";
import { IconCircle } from "@/components/brand/IconCircle";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Users,
  ClipboardList,
  CheckCircle2,
  Clock,
  Award,
  CreditCard,
  Calendar,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_app/dashboard")({
  ssr: false,
  component: DashboardPage,
});

function DashboardPage() {
  const { role } = useAuth();
  return role === "student" ? <StudentDashboard /> : <InstructorDashboard />;
}

interface InstructorStats {
  sessions?: { active: number; completed: number; draft: number; total: number };
  templates?: { total: number; published: number };
  unreadNotifications?: number;
  googleConnected?: boolean;
  upcoming?: { _id: string; title: string; scheduledAt?: string }[];
  recent?: {
    _id: string;
    title: string;
    status: string;
    endedAt?: string;
    avgScore?: number;
  }[];
  chart?: { label: string; sessions: number }[];
}

function InstructorDashboard() {
  const { role } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === "google-connected") {
        qc.invalidateQueries({ queryKey: ["dashboard", "instructor"] });
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [qc]);

  const connectGoogleCalendar = async () => {
    try {
      const redirectUri = window.location.origin + "/auth/google/callback";
      const { data: resp } = await apiGet<{ authUrl: string }>(`/auth/google/connect-url?redirectUri=${encodeURIComponent(redirectUri)}`);
      
      const width = 550;
      const height = 650;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      window.open(
        resp.authUrl,
        "Connect Google Calendar",
        `width=${width},height=${height},top=${top},left=${left}`
      );
    } catch (e) {
      toast.error("Failed to initiate Google Calendar connection.");
    }
  };

  const disconnectGoogleCalendar = async () => {
    if (!confirm("Are you sure you want to disconnect Google Calendar? This will disable automated Google Meet link generation.")) return;
    try {
      await apiDelete("/auth/google/disconnect");
      toast.success("Google Calendar disconnected successfully.");
      qc.invalidateQueries({ queryKey: ["dashboard", "instructor"] });
    } catch (e) {
      toast.error("Failed to disconnect Google Calendar.");
    }
  };

  const { data } = useQuery({
    queryKey: ["dashboard", "instructor"],
    queryFn: async () => (await apiGet<InstructorStats>("/dashboard/instructor")).data,
  });
  const s = data || {};

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="your sessions at a glance"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<IconCircle><Users className="h-5 w-5" /></IconCircle>}
          label="Active sessions"
          value={s.sessions?.active ?? 0}
        />
        <StatCard
          icon={<IconCircle tone="amber"><Clock className="h-5 w-5" /></IconCircle>}
          label="Drafts"
          value={s.sessions?.draft ?? 0}
          accent="amber"
        />
        <StatCard
          icon={<IconCircle><CheckCircle2 className="h-5 w-5" /></IconCircle>}
          label="Completed"
          value={s.sessions?.completed ?? 0}
        />
        <StatCard
          icon={<IconCircle><ClipboardList className="h-5 w-5" /></IconCircle>}
          label="Templates"
          value={s.templates?.total ?? 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-white rounded-2xl border p-5">
          <h2 className="font-display text-lg font-semibold mb-4">
            Sessions overview
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s.chart ?? []}>
                <defs>
                  <linearGradient id="barTeal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5eead4" stopOpacity={1} />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip
                  cursor={{ fill: "rgba(20,184,166,0.06)" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 8px 24px -12px rgba(15,23,42,0.18)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="sessions" fill="url(#barTeal)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-white rounded-2xl border p-5">
          <h2 className="font-display text-lg font-semibold mb-4">Upcoming</h2>
          <ul className="space-y-3">
            {(s.upcoming ?? []).slice(0, 5).map((u) => (
              <li key={u._id} className="flex items-center gap-3">
                <IconCircle size="sm"><Clock className="h-4 w-4" /></IconCircle>
                <div className="flex-1 min-w-0">
                  <Link
                    to="/sessions/$id"
                    params={{ id: u._id }}
                    className="text-sm font-medium hover:text-accent-teal truncate block"
                  >
                    {u.title}
                  </Link>
                  {u.scheduledAt && (
                    <div className="text-xs text-text-muted-light">
                      {new Date(u.scheduledAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </li>
            ))}
            {!s.upcoming?.length && (
              <li className="text-sm text-text-muted-light">Nothing scheduled.</li>
            )}
          </ul>
        </section>

        <section className="lg:col-span-3 bg-white rounded-2xl border p-5">
          <h2 className="font-display text-lg font-semibold mb-4">Recent sessions</h2>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm min-w-[550px]">
              <thead className="text-left text-xs uppercase tracking-wider text-text-muted-light">
                <tr>
                  <th className="py-2">Title</th>
                  <th>Status</th>
                  <th>Ended</th>
                  <th className="text-right">Avg score</th>
                </tr>
              </thead>
              <tbody>
                {(s.recent ?? []).map((r) => (
                  <tr key={r._id} className="border-t">
                    <td className="py-3">
                      <Link to="/sessions/$id" params={{ id: r._id }}
                        className="hover:text-accent-teal">{r.title}</Link>
                    </td>
                    <td className="capitalize">{r.status}</td>
                    <td>{r.endedAt ? new Date(r.endedAt).toLocaleDateString() : "—"}</td>
                    <td className="text-right font-semibold text-accent-teal">
                      {r.avgScore != null ? `${r.avgScore}%` : "—"}
                    </td>
                  </tr>
                ))}
                {!s.recent?.length && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-text-muted-light">
                      No sessions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="lg:col-span-3 bg-white rounded-2xl border border-hairline-light p-6 shadow-elegant space-y-4">
          <div className="flex items-center gap-3">
            <IconCircle><Calendar className="h-5 w-5" /></IconCircle>
            <div className="text-left">
              <h2 className="font-display text-lg font-semibold text-text-on-light">Google Meet Integration</h2>
              <p className="text-xs text-text-muted-light">
                Automate Group Discussion meeting generation through the central Google Calendar account.
              </p>
            </div>
          </div>

          <div className="border border-hairline-light rounded-xl p-4 bg-surface-light flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-left">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-on-light">Status:</span>
                {s.googleConnected ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ● Connected & Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    ● Disconnected / Inactive
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted-light">
                {s.googleConnected
                  ? "Central Google Calendar integration is fully active. Meeting links will be generated automatically when GDs start."
                  : "Central Google Calendar integration is currently inactive. Default placeholders will be used."}
              </p>
            </div>

            {role === "admin" && (
              <div className="flex-shrink-0">
                {s.googleConnected ? (
                  <Button
                    variant="outline"
                    onClick={disconnectGoogleCalendar}
                    className="text-accent-red hover:bg-red-50 hover:text-accent-red border-red-200 text-sm"
                  >
                    Disconnect Calendar
                  </Button>
                ) : (
                  <Button
                    onClick={connectGoogleCalendar}
                    className="bg-accent-teal hover:bg-accent-teal-bright text-white text-sm"
                  >
                    Connect Google Calendar
                  </Button>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

interface StudentStats {
  assigned?: {
    _id: string;
    title: string;
    status: string;
    paymentStatus?: string;
    scheduledAt?: string;
  }[];
  results?: { sessionId: string; title: string; percentScore: number }[];
  avgScore?: number;
  unreadNotifications?: number;
}

function StudentDashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard", "student"],
    queryFn: async () => (await apiGet<StudentStats>("/dashboard/student")).data,
  });
  const s = data || {};
  return (
    <div>
      <PageHeader title="Your dashboard" subtitle="your group discussions" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={<IconCircle><Users className="h-5 w-5" /></IconCircle>}
          label="Assigned sessions"
          value={s.assigned?.length ?? 0}
        />
        <StatCard
          icon={<IconCircle><Award className="h-5 w-5" /></IconCircle>}
          label="Average score"
          value={`${s.avgScore ?? 0}%`}
        />
        <StatCard
          icon={<IconCircle tone="amber"><CreditCard className="h-5 w-5" /></IconCircle>}
          label="Pending payments"
          value={s.assigned?.filter((a) => a.paymentStatus === "pending").length ?? 0}
          accent="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border p-5">
          <h2 className="font-display text-lg font-semibold mb-4">Your sessions</h2>
          <ul className="space-y-3">
            {(s.assigned ?? []).map((a) => (
              <li key={a._id} className="flex items-center gap-3">
                <IconCircle size="sm"><Users className="h-4 w-4" /></IconCircle>
                <div className="flex-1 min-w-0">
                  <Link to="/sessions/$id" params={{ id: a._id }}
                    className="text-sm font-medium hover:text-accent-teal block truncate">
                    {a.title}
                  </Link>
                  <div className="text-xs text-text-muted-light capitalize">
                    {a.status}
                    {a.paymentStatus === "pending" && (
                      <span className="ml-2 inline-block px-2 py-0.5 rounded-full bg-accent-amber/10 text-accent-amber">
                        payment pending
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
            {!s.assigned?.length && (
              <li className="text-sm text-text-muted-light">No sessions yet.</li>
            )}
          </ul>
        </section>
        <section className="bg-white rounded-2xl border p-5">
          <h2 className="font-display text-lg font-semibold mb-4">Published results</h2>
          <ul className="space-y-3">
            {(s.results ?? []).map((r) => (
              <li key={r.sessionId} className="flex items-center gap-3">
                <IconCircle size="sm"><Award className="h-4 w-4" /></IconCircle>
                <div className="flex-1 min-w-0">
                  <Link to="/results/$sessionId" params={{ sessionId: r.sessionId }}
                    className="text-sm font-medium hover:text-accent-teal block truncate">
                    {r.title}
                  </Link>
                </div>
                <span className="font-semibold text-accent-teal">{r.percentScore}%</span>
              </li>
            ))}
            {!s.results?.length && (
              <li className="text-sm text-text-muted-light">No published results yet.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
