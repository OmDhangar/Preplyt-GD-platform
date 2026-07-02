import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { apiGet, apiPatch, ApiError } from "@/lib/api";
import type { Session, Template, Participant, TemplateField, FieldType } from "@/lib/types";
import { PageHeader } from "@/components/brand/PageHeader";
import { LoadingPage } from "@/components/brand/LoadingState";
import { CornerPillBadge } from "@/components/brand/CornerPillBadge";
import { SaveStatusIndicator } from "@/components/brand/SaveStatusIndicator";
import { PresenceStrip } from "@/components/brand/PresenceStrip";
import { FieldRenderer } from "@/components/rubric/FieldRenderer";
import { useLiveEvaluation } from "@/hooks/useLiveEvaluation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ClipboardList } from "lucide-react";

const STANDARD_FIELDS: TemplateField[] = [
  {
    fieldId: "communication",
    label: "Communication Skills",
    type: "weighted_score",
    description: "Clarity, vocabulary, and articulation",
    required: true,
    min: 0,
    max: 10,
    step: 1,
    weight: 2,
    maxScore: 10,
    visibleToStudent: true,
  },
  {
    fieldId: "content_knowledge",
    label: "Content & Knowledge",
    type: "weighted_score",
    description: "Depth and accuracy of information presented",
    required: true,
    min: 0,
    max: 10,
    step: 1,
    weight: 2,
    maxScore: 10,
    visibleToStudent: true,
  },
  {
    fieldId: "leadership",
    label: "Leadership",
    type: "number",
    description: "Ability to lead, initiate, and steer the discussion",
    required: true,
    min: 0,
    max: 10,
    step: 1,
    visibleToStudent: true,
  },
  {
    fieldId: "listening",
    label: "Listening & Responsiveness",
    type: "number",
    description: "Active listening and ability to build on others' points",
    required: true,
    min: 0,
    max: 10,
    visibleToStudent: true,
  },
  {
    fieldId: "body_language",
    label: "Body Language & Confidence",
    type: "select",
    description: "Non-verbal communication and self-confidence",
    required: false,
    options: ["Excellent", "Good", "Average", "Poor"],
    visibleToStudent: true,
  },
];

export const Route = createFileRoute("/_app/sessions/$id/evaluate")({
  ssr: false,
  component: EvaluatePage,
});

function EvaluatePage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data: sessionData } = useQuery({
    queryKey: ["session", id],
    queryFn: async () => (await apiGet<{ session: Session }>(`/sessions/${id}`)).data,
  });
  const session = sessionData?.session;

  const templateId =
    typeof session?.templateId === "string"
      ? session.templateId
      : session?.templateId?._id;

  const { data: templateData } = useQuery({
    enabled: !!templateId,
    queryKey: ["template", templateId],
    queryFn: async () =>
      (await apiGet<{ template: Template }>(`/templates/${templateId}`)).data,
  });
  const template = templateData?.template;

  const { data: participantsData } = useQuery({
    queryKey: ["session", id, "participants"],
    queryFn: async () => {
      const resp = await apiGet<{ participants: any[]; total: number }>(
        `/sessions/${id}/participants`,
      );
      return (resp.data.participants || []).map((p) => ({
        _id: p._id,
        userId: p.studentId?._id || p.studentId,
        name: p.studentId?.name || "Unknown",
        email: p.studentId?.email || "",
        paymentStatus: (p.isPaid ? "paid" : "pending") as "pending" | "paid",
      }));
    },
  });

  const participants = useMemo<Participant[]>(
    () => participantsData ?? [],
    [participantsData],
  );
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);

  const fields = useMemo(() => {
    const baseFields = template?.fields ?? [];
    const missing = STANDARD_FIELDS.filter(
      (sf) => !baseFields.some((bf) => bf.fieldId === sf.fieldId)
    );
    return [...baseFields, ...missing];
  }, [template]);

  const [showCustomParamModal, setShowCustomParamModal] = useState(false);
  const [customParamLabel, setCustomParamLabel] = useState("");
  const [customParamType, setCustomParamType] = useState<FieldType>("weighted_score");
  const [customParamMax, setCustomParamMax] = useState(10);
  const [customParamWeight, setCustomParamWeight] = useState(1);
  const [addingParam, setAddingParam] = useState(false);
  const [savingNow, setSavingNow] = useState(false);
  const [submittingStudentId, setSubmittingStudentId] = useState<string | null>(null);

  const addCustomParam = async () => {
    if (!customParamLabel.trim()) {
      toast.error("Please enter a parameter name");
      return;
    }
    if (!templateId) return;

    const fieldId = customParamLabel.toLowerCase().trim().replace(/[^a-z0-9_]+/g, "_");
    if (fields.some((f) => f.fieldId === fieldId)) {
      toast.error("A parameter with this name already exists");
      return;
    }

    const newField: TemplateField = {
      fieldId,
      label: customParamLabel.trim(),
      type: customParamType,
      required: false,
      visibleToStudent: true,
      min: 0,
      max: customParamMax,
      maxScore: customParamMax,
      weight: customParamWeight,
    };

    setAddingParam(true);
    try {
      const { data: templateResp } = await apiGet<{ template: Template }>(`/templates/${templateId}`);
      const currentTemplate = templateResp.template;
      const updatedFields = [...(currentTemplate.fields || []), newField];
      
      const res = await apiPatch<{ template: Template }>(`/templates/${templateId}`, {
        fields: updatedFields,
      });
      
      const returnedTemplate = res.template;
      if (returnedTemplate._id !== templateId) {
        await apiPatch(`/sessions/${id}`, {
          templateId: returnedTemplate._id,
        });
      }
      
      toast.success("Custom parameter added successfully");
      setShowCustomParamModal(false);
      setCustomParamLabel("");
      
      qc.invalidateQueries({ queryKey: ["template"] });
      qc.invalidateQueries({ queryKey: ["session", id] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to add custom parameter");
    } finally {
      setAddingParam(false);
    }
  };
  const live = useLiveEvaluation(id, fields);

  // Default active student
  if (!activeStudentId && activeStudentId !== "summary" && participants.length) {
    setActiveStudentId(participants[0].userId);
  }

  if (!session || !template) {
    return <LoadingPage title="Loading evaluation" subtitle="Preparing candidates and rubric fields" />;
  }

  const activeValues = activeStudentId && activeStudentId !== "summary" ? live.values[activeStudentId] || {} : {};
  const score = activeStudentId && activeStudentId !== "summary"
    ? live.computedScore(activeStudentId)
    : { totalScore: 0, maxScore: 0, percentScore: 0 };

  const submitOne = async () => {
    if (!activeStudentId) return;
    setSubmittingStudentId(activeStudentId);
    try {
      await live.submitOne(activeStudentId);
      toast.success("Evaluation submitted");
    } catch {
      toast.error("Submit failed");
    } finally {
      setSubmittingStudentId(null);
    }
  };

  return (
    <div>
      <PageHeader
        backUrl={`/sessions/${id}`}
        title={session.title}
        subtitle="live evaluation"
        pill={<CornerPillBadge tone="teal">{session.status}</CornerPillBadge>}
        actions={
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full md:w-auto">
            <PresenceStrip users={live.presence} />
            <SaveStatusIndicator status={live.status} />
            <Button variant="outline" onClick={() => setShowCustomParamModal(true)} className="border-accent-teal text-accent-teal hover:bg-surface-light text-xs sm:text-sm py-1 px-3 sm:py-2 sm:px-4">
              + Custom Parameter
            </Button>
            <Button variant="outline" disabled={savingNow} onClick={async () => {
              setSavingNow(true);
              try {
                const result = await live.flushNow();
                if (result === "saved") toast.success("All changes saved");
                else if (result === "empty") toast.info("No unsaved changes");
                else toast.error("Save failed — will retry");
              } finally {
                setSavingNow(false);
              }
            }} className="text-xs sm:text-sm py-1 px-3 sm:py-2 sm:px-4">
              {savingNow ? "Saving..." : "Save now"}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Mobile Student Selector */}
        {participants.length > 0 && (
          <div className="lg:hidden bg-white border rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-wider text-text-muted-light font-bold">
                Student Selection ({participants.length})
              </label>
              {activeStudentId && activeStudentId !== "summary" && (
                <span className="text-xs font-semibold text-accent-teal">
                  Current Score: {live.computedScore(activeStudentId).percentScore}%
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <select
                value={activeStudentId || ""}
                onChange={(e) => setActiveStudentId(e.target.value)}
                className="flex-1 border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-teal cursor-pointer"
              >
                <option value="summary">📊 Results Summary</option>
                {participants.map((p) => {
                  const s = live.computedScore(p.userId);
                  return (
                    <option key={p.userId} value={p.userId}>
                      {p.name || p.userId} ({s.percentScore}%)
                    </option>
                  );
                })}
              </select>
              <Button
                variant="outline"
                size="sm"
                disabled={participants.length <= 1}
                onClick={() => {
                  const idx = participants.findIndex(p => p.userId === activeStudentId);
                  if (idx > 0) {
                    setActiveStudentId(participants[idx - 1].userId);
                  } else if (idx === 0) {
                    setActiveStudentId("summary");
                  } else {
                    setActiveStudentId(participants[participants.length - 1].userId);
                  }
                }}
                className="px-3 cursor-pointer"
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={participants.length <= 1}
                onClick={() => {
                  const idx = participants.findIndex(p => p.userId === activeStudentId);
                  if (activeStudentId === "summary") {
                    setActiveStudentId(participants[0].userId);
                  } else if (idx !== -1 && idx < participants.length - 1) {
                    setActiveStudentId(participants[idx + 1].userId);
                  } else {
                    setActiveStudentId("summary");
                  }
                }}
                className="px-3 cursor-pointer"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        <aside className="hidden lg:block bg-white border rounded-2xl p-3 h-fit sticky top-4">
          <div className="space-y-2">
            <button
              onClick={() => setActiveStudentId("summary")}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 text-sm font-semibold transition cursor-pointer",
                activeStudentId === "summary"
                  ? "bg-accent-teal/10 text-accent-teal"
                  : "hover:bg-surface-light text-text-on-light"
              )}
            >
              <ClipboardList className="h-4 w-4 text-accent-teal" />
              <span>Results Summary</span>
            </button>
            <div className="h-[1px] bg-gray-100 my-2" />
            <div className="text-xs uppercase tracking-wider text-text-muted-light px-2 py-1">
              Students ({participants.length})
            </div>
            <ul className="space-y-1">
              {participants.map((p) => {
                const s = live.computedScore(p.userId);
                const missingCount = fields.filter(
                  (f) => f.required && (live.values[p.userId]?.[f.fieldId] === undefined || live.values[p.userId]?.[f.fieldId] === null || live.values[p.userId]?.[f.fieldId] === "")
                ).length;
                return (
                  <li key={p.userId}>
                    <button
                      onClick={() => setActiveStudentId(p.userId)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg flex items-center justify-between gap-2 text-sm cursor-pointer",
                        activeStudentId === p.userId
                          ? "bg-surface-light text-accent-teal font-semibold"
                          : "hover:bg-surface-light",
                      )}
                    >
                      <span className="truncate flex-1 text-left">{p.name || p.userId}</span>
                      {missingCount > 0 && (
                        <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold mr-1 shrink-0">
                          {missingCount} left
                        </span>
                      )}
                      <span className="text-xs font-semibold text-accent-teal shrink-0">
                        {s.percentScore}%
                      </span>
                    </button>
                  </li>
                );
              })}
              {!participants.length && (
                <li className="px-2 py-3 text-xs text-text-muted-light">
                  No students assigned.
                </li>
              )}
            </ul>
          </div>
        </aside>

        <section className="bg-white border rounded-2xl p-6">
          {activeStudentId === "summary" ? (
            <div className="space-y-6 text-left">
              <div>
                <h2 className="font-display text-xl font-bold text-text-on-light">
                  GD Evaluation Summary
                </h2>
                <p className="text-sm text-text-muted-light">
                  Review all candidates' scores and complete required criteria before publishing the results.
                </p>
              </div>

              <div className="overflow-x-auto border border-hairline-light rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-surface-light border-b text-left text-xs uppercase tracking-wider text-text-muted-light">
                    <tr>
                      <th className="p-3">Student</th>
                      <th className="p-3">Required Fields</th>
                      <th className="p-3">Comments</th>
                      <th className="p-3">Score</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {participants.map((p) => {
                      const s = live.computedScore(p.userId);
                      const missingFields = fields.filter(
                        (f) => f.required && (live.values[p.userId]?.[f.fieldId] === undefined || live.values[p.userId]?.[f.fieldId] === null || live.values[p.userId]?.[f.fieldId] === "")
                      );
                      const hasComment = !!live.values[p.userId]?.overallComment;

                      return (
                        <tr key={p.userId} className="hover:bg-slate-50/50">
                          <td className="p-3">
                            <button
                              onClick={() => setActiveStudentId(p.userId)}
                              className="font-semibold text-text-on-light hover:text-accent-teal hover:underline text-left block cursor-pointer bg-transparent border-0 p-0"
                            >
                              {p.name || p.userId}
                            </button>
                            <span className="text-[10px] text-text-muted-light">{p.email}</span>
                          </td>
                          <td className="p-3">
                            {missingFields.length === 0 ? (
                              <span className="inline-flex items-center text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5" />
                                All filled
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-xs text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-full">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500 mr-1.5" />
                                Missing {missingFields.length} criteria
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {hasComment ? (
                              <span className="inline-flex items-center text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                                Provided
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">
                                No feedback
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-text-on-light">{s.percentScore}%</span>
                            <span className="text-xs text-text-muted-light ml-1.5">({s.totalScore}/{s.maxScore})</span>
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setActiveStudentId(p.userId)}
                              className="text-xs py-1 px-2.5 h-8 border-accent-teal text-accent-teal hover:bg-surface-light cursor-pointer"
                            >
                              Evaluate
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                    {!participants.length && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-text-muted-light">
                          No candidates assigned.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Action Panel */}
              <div className="bg-surface-light border border-hairline-light rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm text-text-on-light">Ready to Publish?</h4>
                  <p className="text-xs text-text-muted-light max-w-md">
                    Publishing will finalize all drafts, calculate scores, and notify all students via email and notifications. This action is irreversible.
                  </p>
                </div>
                <Button asChild className="w-full sm:w-auto bg-accent-teal hover:bg-accent-teal-bright text-white shadow-glow-teal font-semibold px-6 cursor-pointer">
                  <Link to="/sessions/$id/evaluations/review" params={{ id }}>
                    Review and publish
                  </Link>
                </Button>
              </div>
            </div>
          ) : activeStudentId ? (
            <>
              <div className="flex items-baseline justify-between mb-5">
                <div>
                  <h2 className="font-display text-xl font-semibold">
                    {participants.find((p) => p.userId === activeStudentId)?.name ||
                      "Student"}
                  </h2>
                  <p className="text-xs text-text-muted-light">
                    Score is computed live and saved every 5 seconds.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-accent-teal">
                    {score.percentScore}%
                  </div>
                  <div className="text-xs text-text-muted-light">
                    {score.totalScore} / {score.maxScore}
                  </div>
                </div>
              </div>
              <div className="space-y-5">
                {fields.map((f) => (
                  <FieldRenderer
                    key={f.fieldId}
                    field={f}
                    value={activeValues[f.fieldId]}
                    onChange={(v) =>
                      live.onFieldChange(activeStudentId, f.fieldId, v)
                    }
                  />
                ))}
              </div>
              
              <div className="mt-6 border-t pt-5 space-y-2">
                <label className="block text-sm font-semibold text-text-on-light">
                  Instructor Feedback / Comments
                </label>
                <textarea
                  value={(activeValues["overallComment"] as string) || ""}
                  onChange={(e) =>
                    live.onFieldChange(activeStudentId, "overallComment", e.target.value)
                  }
                  placeholder="Enter detailed feedback and comments for this student..."
                  className="w-full min-h-[100px] p-3 text-sm border rounded-xl focus:ring-2 focus:ring-accent-teal focus:outline-none bg-surface-light resize-y"
                />
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={submitOne}
                  disabled={submittingStudentId === activeStudentId}
                  className="bg-accent-teal hover:bg-accent-teal-bright">
                  {submittingStudentId === activeStudentId ? "Submitting..." : "Submit evaluation"}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-text-muted-light text-center py-20">
              Select a student to evaluate.
            </div>
          )}
        </section>
      </div>
      {showCustomParamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-hairline-light rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 relative overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-accent-teal to-accent-teal-bright" />
            <div>
              <h3 className="font-display text-lg font-bold text-text-on-light">
                Add Custom Parameter
              </h3>
              <p className="text-xs text-text-muted-light">
                Add a new parameter to evaluate students during this Group Discussion.
              </p>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Parameter Name</label>
                <Input
                  value={customParamLabel}
                  onChange={(e) => setCustomParamLabel(e.target.value)}
                  placeholder="e.g. Critical Thinking"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold mb-1">Evaluation Type</label>
                <select
                  value={customParamType}
                  onChange={(e) => setCustomParamType(e.target.value as FieldType)}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-teal"
                >
                  <option value="weighted_score">Weighted Score (0 - Max Score)</option>
                  <option value="number">Raw Number (0 - Max Score)</option>
                  <option value="text">Free-form Text Comment</option>
                  <option value="boolean">Yes/No Checkbox</option>
                </select>
              </div>

              {(customParamType === "weighted_score" || customParamType === "number") && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Max Score</label>
                    <Input
                      type="number"
                      value={customParamMax}
                      onChange={(e) => setCustomParamMax(Number(e.target.value))}
                      min={1}
                    />
                  </div>
                  {customParamType === "weighted_score" && (
                    <div>
                      <label className="block text-xs font-semibold mb-1">Weight Multiplier</label>
                      <Input
                        type="number"
                        value={customParamWeight}
                        onChange={(e) => setCustomParamWeight(Number(e.target.value))}
                        min={1}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCustomParamModal(false)}
                disabled={addingParam}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-accent-teal hover:bg-accent-teal-bright text-white"
                onClick={addCustomParam}
                disabled={addingParam}
              >
                {addingParam ? "Adding..." : "Add Parameter"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
