import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { Session, User } from "@/lib/types";
import { PageHeader } from "@/components/brand/PageHeader";
import { CornerPillBadge } from "@/components/brand/CornerPillBadge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Calendar, Users, Eye } from "lucide-react";

export const Route = createFileRoute("/_app/admin/instructor-gds")({
  ssr: false,
  component: AdminInstructorGdsPage,
});

interface GroupedInstructor {
  _id: string;
  totalSessions: number;
  draftCount: number;
  scheduledCount: number;
  activeCount: number;
  completedCount: number;
  cancelledCount: number;
  totalParticipants: number;
  latestSession?: string;
  instructor: {
    name: string;
    email: string;
    avatar?: string;
    isVerified: boolean;
    verificationStatus: string;
  };
}

interface InstructorSessionsResponse {
  sessions: Session[];
  total: number;
  page: number;
  pages: number;
}

function AdminInstructorGdsPage() {
  const { role } = useAuth();
  const [selectedInstructor, setSelectedInstructor] = useState<GroupedInstructor | null>(null);
  const [page, setPage] = useState(1);

  // Query 1: Grouped aggregations
  const { data: groupedData, isLoading: groupedLoading } = useQuery({
    queryKey: ["instructor-gds", "grouped"],
    queryFn: async () => (await apiGet<{ instructors: GroupedInstructor[] }>("/sessions/admin/by-instructor")).data,
    enabled: role === "admin",
  });

  // Query 2: Drill down sessions list
  const { data: drillDownData, isLoading: drillDownLoading } = useQuery({
    queryKey: ["instructor-gds", "drill-down", selectedInstructor?._id, page],
    queryFn: async () =>
      (await apiGet<InstructorSessionsResponse>(`/sessions/admin/by-instructor/${selectedInstructor?._id}?page=${page}&limit=10`)).data,
    enabled: role === "admin" && !!selectedInstructor?._id,
  });

  if (role !== "admin") {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white border rounded-2xl p-6 text-center space-y-4 shadow-elegant text-left">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xl font-bold">
          🚫
        </div>
        <h2 className="text-xl font-bold text-text-on-light">Access Denied</h2>
        <p className="text-sm text-text-muted-light">
          You do not have administrative permissions to view this dashboard.
        </p>
      </div>
    );
  }

  // Drill down view
  if (selectedInstructor) {
    const list = drillDownData?.sessions || [];
    const totalPages = drillDownData?.pages || 1;

    return (
      <div className="space-y-6 text-left">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedInstructor(null);
              setPage(1);
            }}
            className="text-text-muted-light hover:text-text-on-light"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-on-light">
              Sessions for {selectedInstructor.instructor.name}
            </h1>
            <p className="text-sm text-text-muted-light">
              Instructor Email: {selectedInstructor.instructor.email}
            </p>
          </div>
        </div>

        {drillDownLoading ? (
          <div className="text-text-muted-light">Loading sessions...</div>
        ) : list.length ? (
          <div className="space-y-4">
            <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="bg-surface-light text-left text-xs uppercase tracking-wider text-text-muted-light border-b font-semibold">
                    <tr>
                      <th className="p-4">Title</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Scheduled At</th>
                      <th className="p-4">Participants</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {list.map((s) => (
                      <tr key={s._id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-semibold text-text-on-light">
                          {s.title}
                        </td>
                        <td className="p-4">
                          <CornerPillBadge
                            tone={
                              s.status === "active"
                                ? "teal"
                                : s.status === "scheduled"
                                  ? "amber"
                                  : "dark"
                            }
                          >
                            {s.status}
                          </CornerPillBadge>
                        </td>
                        <td className="p-4 text-text-muted-light">
                          {s.scheduledAt ? new Date(s.scheduledAt).toLocaleString() : "—"}
                        </td>
                        <td className="p-4 text-text-muted-light">
                          {s.participantCount || 0} enrolled
                        </td>
                        <td className="p-4 text-right">
                          <Link to="/sessions/$id" params={{ id: s._id }}>
                            <Button size="sm" variant="outline" className="text-xs h-8">
                              <Eye className="h-3.5 w-3.5 mr-1" /> View GD
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm self-center text-text-muted-light px-2">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 bg-white border border-dashed rounded-2xl text-text-muted-light">
            No sessions found for this instructor.
          </div>
        )}
      </div>
    );
  }

  // Summary list view
  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title="Instructor Sessions Summary"
        subtitle="Overview of group discussions scheduled or hosted by each instructor"
      />

      {groupedLoading ? (
        <div className="text-text-muted-light">Loading statistics...</div>
      ) : groupedData?.instructors?.length ? (
        <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[750px]">
              <thead className="bg-surface-light text-left text-xs uppercase tracking-wider text-text-muted-light border-b font-semibold">
                <tr>
                  <th className="p-4">Instructor</th>
                  <th className="p-4">Total GDs</th>
                  <th className="p-4">Breakdown (D / S / A / C)</th>
                  <th className="p-4">Total Students</th>
                  <th className="p-4">Latest Session Date</th>
                  <th className="p-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {groupedData.instructors.map((grouped) => (
                  <tr key={grouped._id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-text-on-light">
                        {grouped.instructor.name}
                      </div>
                      <div className="text-xs text-text-muted-light">
                        {grouped.instructor.email}
                      </div>
                    </td>
                    <td className="p-4 font-bold text-accent-teal text-base">
                      {grouped.totalSessions}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1.5 text-xs">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium" title="Draft">
                          D: {grouped.draftCount}
                        </span>
                        <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100 font-medium" title="Scheduled">
                          S: {grouped.scheduledCount}
                        </span>
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100 font-medium" title="Active">
                          A: {grouped.activeCount}
                        </span>
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-medium" title="Completed">
                          C: {grouped.completedCount}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-text-muted-light">
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>{grouped.totalParticipants || 0} students</span>
                      </div>
                    </td>
                    <td className="p-4 text-text-muted-light">
                      {grouped.latestSession ? (
                        <div className="flex items-center gap-1 text-xs">
                          <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span>{new Date(grouped.latestSession).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        size="sm"
                        onClick={() => setSelectedInstructor(grouped)}
                        className="bg-accent-teal hover:bg-accent-teal-bright text-white text-xs h-8"
                      >
                        Drill Down
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white border border-dashed rounded-2xl text-text-muted-light">
          No instructor sessions found.
        </div>
      )}
    </div>
  );
}
