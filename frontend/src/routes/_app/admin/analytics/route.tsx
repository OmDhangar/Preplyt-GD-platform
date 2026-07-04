import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/brand/PageHeader";
import { LoadingPage } from "@/components/brand/LoadingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Star,
  Search,
  Filter,
  Calendar,
  MessageSquare,
  Users,
  Award,
  ChevronRight,
  X,
  Sparkles,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { redirect } from "@tanstack/react-router";

// Authenticate and restrict access to admin
export const Route = createFileRoute("/_app/admin/analytics")({
  ssr: false,
  beforeLoad: ({ context }) => {
    // Note: Auth check is also done on the server, but let's prevent load on client if not admin
  },
  component: AdminAnalyticsDashboard,
});

interface FeedbackItem {
  comment: string;
  rating: number;
  createdAt: string;
  student?: {
    name: string;
    email: string;
  };
}

interface AggregatedSession {
  _id: string;
  averageRating: number;
  totalReviews: number;
  comments: FeedbackItem[];
  session: {
    title: string;
    sessionType: "gd" | "personal_interview" | "podcast";
    scheduledAt: string;
  };
  instructor?: {
    name: string;
    email: string;
  };
}

interface AnalyticsResponse {
  totalReviews: number;
  overallAvg: number;
  typeBreakdown: { sessionType: string; avgRating: number; count: number }[];
  sessions: AggregatedSession[];
}

function AdminAnalyticsDashboard() {
  const { role } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedSession, setSelectedSession] = useState<AggregatedSession | null>(null);

  // Fetch feedback data
  const { data, isLoading } = useQuery<AnalyticsResponse>({
    queryKey: ["adminFeedbackAnalytics"],
    queryFn: async () => (await apiGet<AnalyticsResponse>("/feedback/admin/analytics")).data,
  });

  if (role !== "admin") {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white border border-red-200 rounded-2xl p-8 text-center space-y-4 shadow-elegant">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-xl font-bold">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-text-on-light">Access Denied</h2>
        <p className="text-sm text-text-muted-light">
          Only platform administrators are authorized to access the feedback analytics dashboard.
        </p>
        <Button asChild className="bg-slate-900 hover:bg-slate-800 text-white w-full">
          <Link to="/dashboard">Return to Dashboard</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <LoadingPage
        title="Loading Feedback Analytics"
        subtitle="Aggregating student reviews and ratings..."
      />
    );
  }

  const analytics = data || {
    totalReviews: 0,
    overallAvg: 0,
    typeBreakdown: [],
    sessions: [],
  };

  // Filtered sessions
  const filteredSessions = analytics.sessions.filter((s) => {
    const matchesSearch = s.session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.instructor?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || s.session.sessionType === typeFilter;
    return matchesSearch && matchesType;
  });

  // Calculate session type details (GD, PI, Podcast)
  const gdStats = analytics.typeBreakdown.find((t) => t.sessionType === "gd") || { avgRating: 0, count: 0 };
  const piStats = analytics.typeBreakdown.find((t) => t.sessionType === "personal_interview") || { avgRating: 0, count: 0 };
  const podcastStats = analytics.typeBreakdown.find((t) => t.sessionType === "podcast") || { avgRating: 0, count: 0 };

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        backUrl="/dashboard"
        title="Feedback & Analytics"
        subtitle="Aggregate metrics and qualitative student feedback for live sessions"
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Reviews Card */}
        <div className="bg-white border rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-text-muted-light font-semibold uppercase tracking-wider block">Total Reviews</span>
            <span className="text-3xl font-display font-bold text-text-on-light">{analytics.totalReviews}</span>
            <span className="text-[10px] text-text-muted-light block">Submitted by participants</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shadow-inner">
            <MessageSquare className="h-6 w-6" />
          </div>
        </div>

        {/* System Average Rating Card */}
        <div className="bg-white border rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-text-muted-light font-semibold uppercase tracking-wider block">Avg Rating</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-display font-bold text-text-on-light">{analytics.overallAvg}</span>
              <div className="flex items-center text-amber-500">
                <Star className="h-4 w-4 fill-amber-500" />
              </div>
            </div>
            <span className="text-[10px] text-text-muted-light block">Across all session types</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner">
            <Award className="h-6 w-6" />
          </div>
        </div>

        {/* Session Count Converted Card */}
        <div className="bg-white border rounded-2xl p-5 shadow-sm flex items-center justify-between col-span-1 md:col-span-2 lg:col-span-2">
          <div className="flex-1 space-y-3">
            <span className="text-xs text-text-muted-light font-semibold uppercase tracking-wider block">Category Breakdown</span>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <span className="font-semibold block">GD ({gdStats.count})</span>
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  <span className="font-bold text-text-on-light">{gdStats.avgRating || "0"}</span>
                </div>
              </div>
              <div className="space-y-1 border-l pl-4">
                <span className="font-semibold block">PI ({piStats.count})</span>
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  <span className="font-bold text-text-on-light">{piStats.avgRating || "0"}</span>
                </div>
              </div>
              <div className="space-y-1 border-l pl-4">
                <span className="font-semibold block">Podcast ({podcastStats.count})</span>
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  <span className="font-bold text-text-on-light">{podcastStats.avgRating || "0"}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-inner shrink-0 hidden sm:flex">
            <Users className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted-light" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by session title or instructor name..."
            className="pl-9 bg-slate-50 border-slate-200 focus:bg-white text-sm"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Label className="text-xs text-text-muted-dark shrink-0">Filter Type</Label>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v)}>
            <SelectTrigger className="w-full md:w-48 bg-slate-50 border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="gd">Group Discussions (GD)</SelectItem>
              <SelectItem value="personal_interview">Personal Interviews (PI)</SelectItem>
              <SelectItem value="podcast">Podcasts</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Interactive Grid Table */}
      <div className="bg-white border rounded-2xl overflow-hidden shadow-elegant">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-hairline-light text-text-muted-dark text-xs font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-5">Session & Conductor</th>
                <th className="py-3.5 px-5">Session Type</th>
                <th className="py-3.5 px-5">Scheduled Date</th>
                <th className="py-3.5 px-5 text-center">Reviews</th>
                <th className="py-3.5 px-5 text-center">Avg Rating</th>
                <th className="py-3.5 px-5 text-right pr-6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline-light">
              {filteredSessions.map((s) => (
                <tr key={s._id} className="hover:bg-slate-50/50 transition">
                  <td className="py-4 px-5">
                    <div className="font-semibold text-text-on-light leading-snug">{s.session.title}</div>
                    <div className="text-xs text-text-muted-light mt-0.5">Conducted by {s.instructor?.name || "TBD"}</div>
                  </td>
                  <td className="py-4 px-5 align-middle">
                    <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                      s.session.sessionType === "personal_interview"
                        ? "bg-purple-100 text-purple-700"
                        : s.session.sessionType === "podcast"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-sky-100 text-sky-700"
                    }`}>
                      {s.session.sessionType === "personal_interview" ? "PI" : s.session.sessionType === "podcast" ? "Podcast" : "GD"}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-text-muted-dark font-medium align-middle">
                    {s.session.scheduledAt ? new Date(s.session.scheduledAt).toLocaleDateString() : "N/A"}
                  </td>
                  <td className="py-4 px-5 text-center font-bold text-text-on-light align-middle">
                    {s.totalReviews}
                  </td>
                  <td className="py-4 px-5 align-middle">
                    <div className="flex items-center justify-center gap-1 text-center font-display font-bold text-text-on-light">
                      <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                      <span>{s.averageRating}</span>
                    </div>
                  </td>
                  <td className="py-4 px-5 text-right pr-6 align-middle">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedSession(s)}
                      className="text-xs text-accent-teal border-accent-teal hover:bg-accent-teal/5 flex items-center justify-center gap-1.5 ml-auto cursor-pointer"
                    >
                      View Feedback <ChevronRight className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
              {!filteredSessions.length && (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-text-muted-light font-medium">
                    No session feedback matched the filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-hairline-light rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200 text-left flex flex-col max-h-[85vh]">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-accent-teal to-accent-teal-bright" />
            
            <button
              onClick={() => setSelectedSession(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted-light hover:text-text-on-light hover:bg-slate-100 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1.5 pr-8">
              <span className={`inline-block px-2.5 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider ${
                selectedSession.session.sessionType === "personal_interview"
                  ? "bg-purple-100 text-purple-700"
                  : selectedSession.session.sessionType === "podcast"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-sky-100 text-sky-700"
              }`}>
                {selectedSession.session.sessionType === "personal_interview" ? "Personal Interview" : selectedSession.session.sessionType === "podcast" ? "Podcast" : "Group Discussion"}
              </span>
              <h3 className="font-display text-lg font-bold text-text-on-light leading-snug">
                {selectedSession.session.title}
              </h3>
              <p className="text-xs text-text-muted-light">
                Conducted by {selectedSession.instructor?.name || "TBD"} on {selectedSession.session.scheduledAt ? new Date(selectedSession.session.scheduledAt).toLocaleString() : "N/A"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-hairline-light rounded-xl p-4 text-xs font-semibold text-text-muted-dark">
              <div className="space-y-1">
                <span>TOTAL REVIEWS</span>
                <span className="block text-xl font-bold text-text-on-light font-display">{selectedSession.totalReviews}</span>
              </div>
              <div className="space-y-1 border-l pl-4">
                <span>AVERAGE RATING</span>
                <div className="flex items-center gap-1 text-xl font-bold text-text-on-light font-display">
                  <Star className="h-4.5 w-4.5 text-amber-500 fill-amber-500" />
                  <span>{selectedSession.averageRating} / 5.0</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted-light block mb-2">Student Comments & Review List</h4>
              {selectedSession.comments && selectedSession.comments.length > 0 ? (
                selectedSession.comments.map((item, idx) => (
                  <div key={idx} className="border border-hairline-light rounded-xl p-3.5 bg-white space-y-2 shadow-sm hover:border-slate-300 transition">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-xs text-text-on-light">{item.student?.name || "Anonymous Student"}</div>
                        <div className="text-[10px] text-text-muted-light">{item.student?.email || ""}</div>
                      </div>
                      <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded-full text-xs font-bold text-amber-800 shrink-0">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        <span>{item.rating}</span>
                      </div>
                    </div>
                    {item.comment ? (
                      <p className="text-xs text-text-muted-dark bg-slate-50 p-2.5 rounded-lg border italic">
                        "{item.comment}"
                      </p>
                    ) : (
                      <p className="text-xs text-text-muted-light italic">
                        No comment left.
                      </p>
                    )}
                    <div className="text-[9px] text-right text-text-muted-light">
                      Submitted on {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-text-muted-light py-8 text-center bg-slate-50 border border-dashed rounded-xl">
                  No written comments have been submitted for this session. (Feedbacks consist of rating-only submissions)
                </div>
              )}
            </div>

            <div className="pt-2 border-t flex justify-end">
              <Button
                onClick={() => setSelectedSession(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-4"
              >
                Close details
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
