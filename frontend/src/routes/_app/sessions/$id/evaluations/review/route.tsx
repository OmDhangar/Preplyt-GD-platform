import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import type { Evaluation, Participant, Session, Template } from "@/lib/types";
import { PageHeader } from "@/components/brand/PageHeader";
import { LoadingPage } from "@/components/brand/LoadingState";
import { CornerPillBadge } from "@/components/brand/CornerPillBadge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  missingRequiredFields,
  participantStudentId,
  statusTone,
  userId,
  userName,
} from "@/lib/evaluation-utils";

export const Route = createFileRoute("/_app/sessions/$id/evaluations/review")({
  ssr: false,
  component: EvaluationReviewPage,
});

function EvaluationReviewPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { role } = useAuth();
  const isStaff = role === "instructor" || role === "admin";
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

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
          Publishing evaluations is available only to instructors and admins.
        </p>
      </div>
    );
  }

  if (sessionQuery.isLoading || templateQuery.isLoading || participantsQuery.isLoading || evaluationsQuery.isLoading) {
    return <LoadingPage title="Loading review" subtitle="Checking scores, feedback, and required criteria" />;
  }

  const fields = templateQuery.data?.template.fields || [];
  const participants = (participantsQuery.data || []) as Participant[];
  const evaluations = evaluationsQuery.data?.evaluations || [];
  const byStudentId = evaluations.reduce<Record<string, Evaluation>>((acc, record) => {
    acc[userId(record.studentId)] = record;
    return acc;
  }, {});

  const rows = participants.map((participant) => {
    const studentId = participantStudentId(participant);
    const record = byStudentId[studentId];
    const missing = missingRequiredFields(fields, record);
    return { participant, studentId, record, missing };
  });

  const missingCount = rows.reduce((total, row) => total + row.missing.length, 0);
  const noFeedbackCount = rows.filter((row) => !row.record?.overallComment).length;
  const publishableCount = rows.filter((row) => row.record?.status !== "published").length;

  const publish = async () => {
    setPublishing(true);
    try {
      await apiPost(`/evaluations/sessions/${id}/evaluations/publish`);
      toast.success("Evaluations published");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["session", id] }),
        qc.invalidateQueries({ queryKey: ["sessionEvaluations", id] }),
        qc.invalidateQueries({ queryKey: ["sessionResults", id] }),
        qc.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      navigate({ to: "/sessions/$id/results", params: { id } });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to publish evaluations");
    } finally {
      setPublishing(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div>
      <PageHeader
        backUrl={`/sessions/${id}`}
        title="Review evaluations"
        subtitle={session?.title || "final check before publishing"}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/sessions/$id/evaluations" params={{ id }}>View all</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/sessions/$id/evaluate" params={{ id }}>Edit evaluations</Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <ReviewMetric label="Candidates" value={rows.length} />
        <ReviewMetric label="To publish" value={publishableCount} />
        <ReviewMetric label="Missing required" value={missingCount} tone={missingCount ? "amber" : "teal"} />
        <ReviewMetric label="No feedback" value={noFeedbackCount} tone={noFeedbackCount ? "amber" : "teal"} />
      </div>

      <section className="bg-white border rounded-2xl p-5 overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="text-left text-xs uppercase tracking-wider text-text-muted-light">
            <tr>
              <th className="py-2">Student</th>
              <th>Status</th>
              <th>Required criteria</th>
              <th>Score</th>
              <th>Feedback</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ participant, studentId, record, missing }) => (
              <tr key={studentId} className="border-t">
                <td className="py-3">
                  <div className="font-medium">
                    {participant.name || userName(record?.studentId)}
                  </div>
                  <div className="text-xs text-text-muted-light">{participant.email}</div>
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
                    <span className="text-amber-600 font-medium">
                      {missing.map((field) => field.label).join(", ")}
                    </span>
                  )}
                </td>
                <td className="font-semibold text-accent-teal">
                  {record?.percentScore != null ? `${record.percentScore}%` : "-"}
                </td>
                <td>{record?.overallComment ? "Provided" : "Missing"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="bg-surface-light border rounded-2xl p-5 mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-text-on-light">
            Ready to publish?
          </h2>
          <p className="text-sm text-text-muted-light">
            Publishing finalizes draft and submitted evaluations, calculates scores, and notifies students.
          </p>
        </div>
        <Button
          onClick={() => setConfirmOpen(true)}
          disabled={publishing || !rows.length || publishableCount === 0}
          className="bg-accent-teal hover:bg-accent-teal-bright text-white"
        >
          {publishing ? "Publishing..." : "Publish evaluations"}
        </Button>
      </section>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish evaluations to students?</AlertDialogTitle>
            <AlertDialogDescription>
              This will publish {publishableCount} evaluation{publishableCount === 1 ? "" : "s"}.
              {missingCount > 0 ? ` ${missingCount} required field value(s) are still missing.` : ""}
              This action cannot be edited from the student-facing result view afterward.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={publishing}>Cancel</AlertDialogCancel>
            <Button
              onClick={publish}
              disabled={publishing}
              className="bg-accent-teal hover:bg-accent-teal-bright text-white"
            >
              {publishing ? "Publishing..." : "Confirm publish"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ReviewMetric({
  label,
  value,
  tone = "dark",
}: {
  label: string;
  value: number;
  tone?: "dark" | "teal" | "amber";
}) {
  const color =
    tone === "teal" ? "text-accent-teal" : tone === "amber" ? "text-accent-amber" : "text-text-on-light";
  return (
    <div className="bg-white border rounded-2xl p-5">
      <div className="text-xs uppercase tracking-wider text-text-muted-light">{label}</div>
      <div className={`text-3xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}
