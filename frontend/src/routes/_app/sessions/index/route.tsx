import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import type { Session } from "@/lib/types";
import { PageHeader } from "@/components/brand/PageHeader";
import { CornerPillBadge } from "@/components/brand/CornerPillBadge";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Video, Award, Key, ArrowRight, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/sessions/")({
  ssr: false,
  component: SessionsList,
});

const statusTone: Record<string, "dark" | "teal" | "amber" | "red"> = {
  draft: "dark",
  scheduled: "amber",
  active: "teal",
  completed: "dark",
  published: "teal",
};

function SessionsList() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const isStudent = role === "student";

  // Tab state for student
  const [studentTab, setStudentTab] = useState<"upcoming" | "joined" | "past">("upcoming");

  // Student queries
  const { data: upcoming, isLoading: upcomingLoading } = useQuery({
    enabled: isStudent,
    queryKey: ["sessions", "upcoming"],
    queryFn: async () => (await apiGet<Session[]>("/sessions?filterType=upcoming")).data,
  });

  const { data: joined, isLoading: joinedLoading } = useQuery({
    enabled: isStudent,
    queryKey: ["sessions", "joined"],
    queryFn: async () => (await apiGet<Session[]>("/sessions?filterType=joined")).data,
  });

  const { data: past, isLoading: pastLoading } = useQuery({
    enabled: isStudent,
    queryKey: ["sessions", "past"],
    queryFn: async () => (await apiGet<Session[]>("/sessions?filterType=past")).data,
  });

  // Instructor/Admin query
  const { data: instructorSessions, isLoading: instructorLoading } = useQuery({
    enabled: !isStudent,
    queryKey: ["sessions", "instructor"],
    queryFn: async () => (await apiGet<Session[]>("/sessions")).data,
  });

  const handleJoinByCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const code = fd.get("code")?.toString().trim().toUpperCase();
    if (!code) return;
    navigate({ to: `/sessions/join/${code}` });
  };

  if (isStudent) {
    const list = studentTab === "upcoming" ? upcoming : studentTab === "joined" ? joined : past;
    const loading = studentTab === "upcoming" ? upcomingLoading : studentTab === "joined" ? joinedLoading : pastLoading;

    return (
      <div className="space-y-6">
        <PageHeader
          title="Group Discussions"
          subtitle="browse and join live practice rounds on PrepLyt"
          actions={
            <form onSubmit={handleJoinByCode} className="flex gap-2 items-center">
              <input
                name="code"
                type="text"
                required
                maxLength={6}
                placeholder="Enter Join Code..."
                className="bg-white border text-sm rounded-lg px-3 py-2 w-36 uppercase tracking-wider text-center focus:outline-none focus:border-accent-teal"
              />
              <Button type="submit" className="bg-accent-teal hover:bg-accent-teal-bright text-white text-xs py-2 px-3">
                Join
              </Button>
            </form>
          }
        />

        {/* Student Tabs Navigation */}
        <div className="flex border-b gap-6 text-sm font-semibold mb-6">
          {(["upcoming", "joined", "past"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setStudentTab(t)}
              className={
                "pb-3 capitalize transition-all border-b-2 " +
                (studentTab === t
                  ? "border-accent-teal text-accent-teal"
                  : "border-transparent text-text-muted-light hover:text-text-on-light")
              }
            >
              {t === "upcoming" ? "Upcoming GDs" : t === "joined" ? "My Joined GDs" : "Past GDs"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-text-muted-light">Loading sessions…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {(list || []).map((s) => (
              <div
                key={s._id}
                className="bg-white border rounded-2xl p-4 flex flex-col justify-between hover:border-accent-teal/40 transition shadow-elegant"
              >
                <div className="space-y-3">
                  {s.posterUrl && (
                    <div className="w-full h-32 rounded-xl overflow-hidden mb-3 border border-hairline-light shrink-0">
                      <img src={s.posterUrl} alt={s.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display font-semibold text-base line-clamp-1">
                      {s.title}
                    </h3>
                    <CornerPillBadge tone={statusTone[s.status] || "dark"}>
                      {s.status}
                    </CornerPillBadge>
                  </div>
                  {s.description && (
                    <p className="text-sm text-text-muted-light line-clamp-2">
                      {s.description}
                    </p>
                  )}
                  <div className="text-xs text-text-muted-light space-y-1.5 pt-1">
                    {s.scheduledAt && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-accent-teal" />
                        <span>📅 {new Date(s.scheduledAt).toLocaleString()}</span>
                      </div>
                    )}
                    {s.googleMeetUrl && studentTab === "joined" && (
                      <div className="flex items-center gap-2">
                        <Video className="h-3.5 w-3.5 text-accent-teal" />
                        <a href={s.googleMeetUrl} target="_blank" rel="noopener noreferrer" className="text-accent-teal hover:underline font-medium">
                          Google Meet Room
                        </a>
                      </div>
                    )}
                    {s.joinCode && studentTab === "joined" && (
                      <div className="flex items-center gap-2">
                        <Key className="h-3.5 w-3.5 text-accent-teal" />
                        <span>Code: <code className="bg-surface-light px-1.5 py-0.5 rounded font-mono font-bold text-xs">{s.joinCode}</code></span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-hairline-light pt-4 mt-5 flex items-center justify-between gap-2">
                  {studentTab === "upcoming" ? (
                    <>
                      <div>
                        <span className="text-[10px] text-text-muted-light uppercase tracking-wider font-semibold">Fee</span>
                        <div className="text-base font-bold text-text-on-light">
                          {s.requiresPayment && s.sessionFee ? `${s.sessionFee.currency} ${s.sessionFee.amount}` : "Free"}
                        </div>
                      </div>
                      <Link to="/sessions/join/$code" params={{ code: s.joinCode || "" }}>
                        <Button className="bg-accent-teal hover:bg-accent-teal-bright text-white text-xs px-4">
                          Register <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      </Link>
                    </>
                  ) : studentTab === "joined" ? (
                    <>
                      <div className="text-xs text-text-muted-light font-medium">
                        Joined & Paid
                      </div>
                      <div className="flex gap-2">
                        <Link to="/sessions/$id" params={{ id: s._id }}>
                          <Button variant="outline" className="text-xs px-3">Details</Button>
                        </Link>
                        {s.status === "active" && s.googleMeetUrl && (
                          <a href={s.googleMeetUrl} target="_blank" rel="noopener noreferrer">
                            <Button className="bg-accent-teal hover:bg-accent-teal-bright text-white text-xs px-3">
                              Join Meet
                            </Button>
                          </a>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      {s.sessionType !== "podcast" ? (
                        <>
                          <div className="flex items-center gap-1 text-xs text-text-muted-light font-medium">
                            <Award className="h-4 w-4 text-accent-teal" /> Evaluation Available
                          </div>
                          <Link to="/results/$sessionId" params={{ sessionId: s._id }}>
                            <Button className="bg-accent-teal hover:bg-accent-teal-bright text-white text-xs px-3">
                              View Results
                            </Button>
                          </Link>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1 text-xs text-text-muted-light font-medium">
                            🎧 Podcast Completed
                          </div>
                          <Link to="/sessions/$id" params={{ id: s._id }}>
                            <Button variant="outline" className="text-xs px-3">
                              Details & Feedback
                            </Button>
                          </Link>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
            {!list?.length && (
              <div className="text-text-muted-light col-span-full text-center py-14 bg-white border border-dashed rounded-2xl">
                No sessions found in this category.
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Instructor/Admin View
  return (
    <div>
      <PageHeader
        title="GD Sessions Dashboard"
        subtitle="create, edit, and evaluate live PrepLyt discussions"
        actions={
          <Link to="/sessions/new">
            <Button className="bg-accent-teal hover:bg-accent-teal-bright text-white">
              <Plus className="h-4 w-4 mr-1" /> New session
            </Button>
          </Link>
        }
      />

      {instructorLoading ? (
        <div className="text-text-muted-light">Loading dashboard…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {(instructorSessions || []).map((s) => (
            <Link
              key={s._id}
              to="/sessions/$id"
              params={{ id: s._id }}
              className="bg-white border rounded-2xl p-4 hover:border-accent-teal/40 transition shadow-elegant flex flex-col justify-between"
            >
              <div className="space-y-3">
                {s.posterUrl && (
                  <div className="w-full h-32 rounded-xl overflow-hidden mb-3 border border-hairline-light shrink-0">
                    <img src={s.posterUrl} alt={s.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-semibold text-base line-clamp-2">
                      {s.title}
                    </h3>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                      s.sessionType === "personal_interview"
                        ? "bg-purple-100 text-purple-700"
                        : s.sessionType === "podcast"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-sky-100 text-sky-700"
                    }`}>
                      {s.sessionType === "personal_interview" ? "PI" : s.sessionType === "podcast" ? "Podcast" : "GD"}
                    </span>
                  </div>
                  <CornerPillBadge tone={statusTone[s.status] || "dark"}>
                    {s.status}
                  </CornerPillBadge>
                </div>
                {s.description && (
                  <p className="text-sm text-text-muted-light line-clamp-2">
                    {s.description}
                  </p>
                )}
                <div className="text-xs text-text-muted-dark space-y-1.5 pt-1">
                  {s.scheduledAt && (
                    <div className="flex items-center gap-1.5">
                      <span>📅 {new Date(s.scheduledAt).toLocaleString()}</span>
                    </div>
                  )}
                  {s.googleMeetUrl && (
                    <div className="flex items-center gap-1.5">
                      <Video className="h-3.5 w-3.5 text-accent-teal" />
                      <span className="text-accent-teal font-medium truncate">{s.googleMeetUrl}</span>
                    </div>
                  )}
                  {s.joinCode && (
                    <div className="flex items-center gap-1.5">
                      <span>🔑 Code: <code className="bg-surface-light px-1 py-0.5 rounded font-mono font-bold">{s.joinCode}</code></span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-hairline-light pt-4 mt-5 flex items-center justify-between text-xs text-text-muted-light">
                <span className={
                  s.maxParticipants && (s.participantCount ?? 0) >= s.maxParticipants
                    ? "text-red-600 font-semibold"
                    : ""
                }>
                  👥 {s.participantCount || 0}{s.maxParticipants ? ` / ${s.maxParticipants}` : ""} participants
                  {s.maxParticipants && (s.participantCount ?? 0) >= s.maxParticipants && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold bg-red-100 text-red-700 rounded-full uppercase">Full</span>
                  )}
                </span>
                {s.status === "active" ? (
                  <span className="text-accent-teal font-bold animate-pulse">● LIVE Evaluation</span>
                ) : (
                  <span>Click to manage</span>
                )}
              </div>
            </Link>
          ))}
          {!instructorSessions?.length && (
            <div className="text-text-muted-light col-span-full text-center py-14 bg-white border border-dashed rounded-2xl">
              No sessions scheduled. Click "New session" to get started.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
