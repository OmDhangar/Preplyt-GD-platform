import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { apiGet, apiPatch, ApiError } from "@/lib/api";
import type { Session, Template, Participant, TemplateField, FieldType } from "@/lib/types";
import { PageHeader } from "@/components/brand/PageHeader";
import { CornerPillBadge } from "@/components/brand/CornerPillBadge";
import { SaveStatusIndicator } from "@/components/brand/SaveStatusIndicator";
import { PresenceStrip } from "@/components/brand/PresenceStrip";
import { FieldRenderer } from "@/components/rubric/FieldRenderer";
import { useLiveEvaluation } from "@/hooks/useLiveEvaluation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  if (!activeStudentId && participants.length) {
    setActiveStudentId(participants[0].userId);
  }

  if (!session || !template) {
    return <div className="text-text-muted-light">Loading evaluation…</div>;
  }

  const activeValues = activeStudentId ? live.values[activeStudentId] || {} : {};
  const score = activeStudentId
    ? live.computedScore(activeStudentId)
    : { totalScore: 0, maxScore: 0, percentScore: 0 };

  const submitOne = async () => {
    if (!activeStudentId) return;
    try {
      await live.submitOne(activeStudentId);
      toast.success("Evaluation submitted");
    } catch {
      toast.error("Submit failed");
    }
  };

  return (
    <div>
      <PageHeader
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
            <Button variant="outline" onClick={async () => {
              const result = await live.flushNow();
              if (result === "saved") toast.success("All changes saved");
              else if (result === "empty") toast.info("No unsaved changes");
              else toast.error("Save failed — will retry");
            }} className="text-xs sm:text-sm py-1 px-3 sm:py-2 sm:px-4">
              Save now
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
              {activeStudentId && (
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
                  if (idx !== -1 && idx < participants.length - 1) {
                    setActiveStudentId(participants[idx + 1].userId);
                  } else {
                    setActiveStudentId(participants[0].userId);
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
          <div className="text-xs uppercase tracking-wider text-text-muted-light px-2 py-1">
            Students
          </div>
          <ul className="space-y-1">
            {participants.map((p) => {
              const s = live.computedScore(p.userId);
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
                    <span className="truncate">{p.name || p.userId}</span>
                    <span className="text-xs font-semibold text-accent-teal">
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
        </aside>

        <section className="bg-white border rounded-2xl p-6">
          {activeStudentId ? (
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
                  className="bg-accent-teal hover:bg-accent-teal-bright">
                  Submit evaluation
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
