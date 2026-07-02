import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { Evaluation, Participant, Session, Template } from "@/lib/types";
import { PageHeader } from "@/components/brand/PageHeader";
import { LoadingPage } from "@/components/brand/LoadingState";
import { CornerPillBadge } from "@/components/brand/CornerPillBadge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  missingRequiredFields,
  participantStudentId,
  statusTone,
  userEmail,
  userId,
  userName,
} from "@/lib/evaluation-utils";

export const Route = createFileRoute("/_app/sessions/$id/evaluations/")({
  ssr: false,
  component: EvaluationsPage,
});

function EvaluationsPage() {
  const { id } = Route.useParams();
  const { role } = useAuth();
  const isStaff = role === "instructor" || role === "admin";

  const sessionQuery = useQuery({
    queryKey: ["session", id],
    queryFn: async () => (await apiGet<{ session: Session }>(`/sessions/${id}`)).data,
  });
  const session = sessionQuery.data?.session;
  const templateId =
    typeof session?.templateId === "string" ? session.templateId : session?.templateId?._id;

  const templateQuery = useQuery({
    enabled: !!templateId && isStaff,
    queryKey: ["template", templateId],
    queryFn: async () => (await apiGet<{ template: Template }>(`/templates/${templateId}`)).data,
  });

  const participantsQuery = useQuery({
    enabled: isStaff,
    queryKey: ["session", id, "participants"],
    queryFn: async () => {
      const resp = await apiGet<{ participants: any[] }>(`/sessions/${id}/participants`);
      return (resp.data.participants || []).map((p) => ({
        _id: p._id,
        userId: p.studentId?._id || p.studentId,
        name: p.studentId?.name || "Unknown",
        email: p.studentId?.email || "",
      }));
    },
  });

  const evaluationsQuery = useQuery({
    enabled: isStaff,
    queryKey: ["sessionEvaluations", id],
    queryFn: async () =>
      (await apiGet<{ evaluations: Evaluation[]; total: number }>(
        `/evaluations/sessions/${id}/evaluations`,
      )).data,
  });

  if (!isStaff) {
    return (
      <div className="max-w-2xl bg-white border border-red-200 rounded-2xl p-8 text-center space-y-3">
        <h2 className="text-xl font-bold text-text-on-light">Access denied</h2>
        <p className="text-sm text-text-muted-light">
          Evaluation records are available only to instructors and admins.
        </p>
      </div>
    );
  }

  if (sessionQuery.isLoading || templateQuery.isLoading || participantsQuery.isLoading || evaluationsQuery.isLoading) {
    return <LoadingPage title="Loading evaluations" subtitle="Preparing the session evaluation ledger" />;
  }

  const fields = templateQuery.data?.template.fields || [];
  const evaluations = evaluationsQuery.data?.evaluations || [];
  const byStudentId = evaluations.reduce<Record<string, Evaluation>>((acc, record) => {
    acc[userId(record.studentId)] = record;
    return acc;
  }, {});
  const participants = (participantsQuery.data || []) as Participant[];
  const published = evaluations.filter((record) => record.status === "published").length;
  const submitted = evaluations.filter((record) => record.status === "submitted").length;

  return (
    <div>
      <PageHeader
        backUrl={`/sessions/${id}`}
        title="View evaluations"
        subtitle={session?.title || "session evaluation records"}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/sessions/$id/evaluate" params={{ id }}>Open evaluator</Link>
            </Button>
            <Button asChild className="bg-accent-teal hover:bg-accent-teal-bright">
              <Link to="/sessions/$id/evaluations/review" params={{ id }}>Review publish</Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard label="Candidates" value={participants.length} />
        <SummaryCard label="Submitted" value={submitted} />
        <SummaryCard label="Published" value={published} />
      </div>

      <section className="bg-white border rounded-2xl p-5 overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="text-left text-xs uppercase tracking-wider text-text-muted-light">
            <tr>
              <th className="py-2">Student</th>
              <th>Status</th>
              <th>Required fields</th>
              <th>Feedback</th>
              <th>Score</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((participant) => {
              const studentId = participantStudentId(participant);
              const record = byStudentId[studentId];
              const missing = missingRequiredFields(fields, record);
              return (
                <tr key={studentId} className="border-t">
                  <td className="py-3">
                    <div className="font-medium">{participant.name || userName(record?.studentId)}</div>
                    <div className="text-xs text-text-muted-light">
                      {participant.email || userEmail(record?.studentId)}
                    </div>
                  </td>
                  <td>
                    <CornerPillBadge tone={statusTone(record?.status)}>
                      {record?.status || "not started"}
                    </CornerPillBadge>
                  </td>
                  <td>
                    {missing.length === 0 ? (
                      <span className="text-emerald-600 font-medium">Complete</span>
                    ) : (
                      <span className="text-amber-600 font-medium">{missing.length} missing</span>
                    )}
                  </td>
                  <td>{record?.overallComment ? "Provided" : "No feedback"}</td>
                  <td className="font-semibold text-accent-teal">
                    {record?.percentScore != null ? `${record.percentScore}%` : "-"}
                  </td>
                  <td className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link to="/sessions/$id/evaluate" params={{ id }}>Evaluate</Link>
                    </Button>
                  </td>
                </tr>
              );
            })}
            {!participants.length && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-text-muted-light">
                  No candidates assigned to this session.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border rounded-2xl p-5">
      <div className="text-xs uppercase tracking-wider text-text-muted-light">{label}</div>
      <div className="text-3xl font-bold text-text-on-light mt-1">{value}</div>
    </div>
  );
}
