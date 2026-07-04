import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from "@/lib/api";
import type { Session, User, Attachment } from "@/lib/types";
import { PageHeader } from "@/components/brand/PageHeader";
import { LoadingPage, LoadingSection } from "@/components/brand/LoadingState";
import { CornerPillBadge } from "@/components/brand/CornerPillBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IconCircle } from "@/components/brand/IconCircle";

import { toast } from "sonner";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Play,
  Star,
  Square,
  Trash2,
  Copy,
  Users as UsersIcon,
  RefreshCw,
  Paperclip,
  Lock,
  Plus,
  Link as LinkIcon,
  Download,
  ExternalLink,
  Calendar,
  Clock,
  FileText,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_app/sessions/$id/")({
  ssr: false,
  component: SessionDetail,
});

const lifecycle = [
  { key: "draft", label: "Draft" },
  { key: "scheduled", label: "Scheduled" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "published", label: "Published" },
];

function SessionDetail() {
  const { id } = Route.useParams();
  const { role, user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const isStaff = role === "instructor" || role === "admin";
  const [showStartModal, setShowStartModal] = useState(false);
  const [loadingStart, setLoadingStart] = useState(false);
  const [loadingMeet, setLoadingMeet] = useState(false);
  const [loadingEnd, setLoadingEnd] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [meetUrlInput, setMeetUrlInput] = useState("");

  // Reschedule state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [newDateInput, setNewDateInput] = useState("");
  const [newDurationInput, setNewDurationInput] = useState(45);
  const [loadingReschedule, setLoadingReschedule] = useState(false);

  // Edit state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editTopic, setEditTopic] = useState("");
  const [editCoInstructors, setEditCoInstructors] = useState<string[]>([]);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [editCoOpen, setEditCoOpen] = useState(false);

  const { data: instructors, isLoading: instructorsLoading } = useQuery({
    queryKey: ["users", "instructors", "verified"],
    queryFn: async () => {
      const resp = await apiGet<{ users: User[] }>("/users?role=instructor&limit=1000");
      return (resp.data.users || []).filter((u) => u.isVerified);
    },
    enabled: isStaff,
  });

  // Add attachment state
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [attTitle, setAttTitle] = useState("");
  const [attDesc, setAttDesc] = useState("");
  const [attFile, setAttFile] = useState<File | null>(null);
  const [loadingAttachment, setLoadingAttachment] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);

  const { data: sessionData } = useQuery({
    queryKey: ["session", id],
    queryFn: async () => (await apiGet<{ session: Session }>(`/sessions/${id}`)).data,
  });
  const session = sessionData?.session;

  const { data: attachmentsData, error: attachmentsError, refetch: refetchAttachments } = useQuery({
    queryKey: ["session", id, "attachments"],
    queryFn: async () => (await apiGet<{ attachments: Attachment[] }>(`/sessions/${id}/attachments`)).data,
    retry: false,
  });
  const attachments = attachmentsData?.attachments || [];

  const reload = () => qc.invalidateQueries({ queryKey: ["session", id] });

  const startAndRedirect = async () => {
    setLoadingStart(true);
    try {
      if (meetUrlInput !== session?.googleMeetUrl) {
        await apiPatch(`/sessions/${id}`, { googleMeetUrl: meetUrlInput });
      }
      await apiPost(`/sessions/${id}/start`);
      toast.success("Session started");
      qc.invalidateQueries({ queryKey: ["session", id] });
      navigate({ to: "/sessions/$id/evaluate", params: { id } });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to start session");
    } finally {
      setLoadingStart(false);
    }
  };
  const generateMeetLink = async () => {
    setLoadingMeet(true);
    try {
      const resp = await apiPost<{ session: Session }>(`/sessions/${id}/google-meet`);
      const newUrl = resp.session?.googleMeetUrl || "";
      setMeetUrlInput(newUrl);
      toast.success("Successfully generated Google Meet URL!");
      reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to generate Google Meet URL.");
    } finally {
      setLoadingMeet(false);
    }
  };
  const end = async () => {
    setLoadingEnd(true);
    try { await apiPost(`/sessions/${id}/end`); toast.success("Session ended"); reload(); }
    catch (e) { toast.error(e instanceof ApiError ? e.message : "Failed"); }
    finally { setLoadingEnd(false); }
  };
  const remove = async () => {
    if (!confirm("Delete this session?")) return;
    setLoadingDelete(true);
    try {
      await apiDelete(`/sessions/${id}`);
      toast.success("Deleted");
      navigate({ to: "/sessions" });
    }
    catch (e) { toast.error(e instanceof ApiError ? e.message : "Failed"); }
    finally { setLoadingDelete(false); }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDateInput) {
      toast.error("Please select a new date and time.");
      return;
    }
    setLoadingReschedule(true);
    try {
      await apiPatch(`/sessions/${id}/reschedule`, {
        newScheduledAt: new Date(newDateInput).toISOString(),
        durationMins: Number(newDurationInput),
      });
      toast.success("Session rescheduled successfully");
      setShowRescheduleModal(false);
      reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to reschedule session");
    } finally {
      setLoadingReschedule(false);
    }
  };
 
  const openEditModal = () => {
    if (!session) return;
    setEditTitle(session.title || "");
    setEditDesc(session.description || "");
    setEditTopic(session.topic || "");
    setEditCoInstructors((session.coInstructors || []).map((c: any) => c._id || c));
    setShowEditModal(true);
  };

  const handleEditSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingEdit(true);
    try {
      await apiPatch(`/sessions/${id}`, {
        title: editTitle,
        description: editDesc,
        topic: editTopic,
        coInstructors: editCoInstructors,
      });
      toast.success("Session updated successfully");
      setShowEditModal(false);
      reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to update session");
    } finally {
      setLoadingEdit(false);
    }
  };

  const handleAddAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attTitle || !attFile) {
      toast.error("Title and File are required.");
      return;
    }
    setLoadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append("title", attTitle);
      formData.append("description", attDesc);
      formData.append("file", attFile);

      await apiPost(`/sessions/${id}/attachments`, formData);
      toast.success("Attachment uploaded successfully");
      setShowAttachmentModal(false);
      setAttTitle("");
      setAttDesc("");
      setAttFile(null);
      refetchAttachments();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to upload attachment");
    } finally {
      setLoadingAttachment(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm("Are you sure you want to delete this attachment?")) return;
    setDeletingAttachmentId(attachmentId);
    try {
      await apiDelete(`/sessions/${id}/attachments/${attachmentId}`);
      toast.success("Attachment deleted");
      refetchAttachments();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to delete attachment");
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  if (!session) return <LoadingPage title="Loading session" subtitle="Fetching session details and participants" />;

  const currentStep = lifecycle.findIndex((l) => l.key === session.status);

  return (
    <div>
      <PageHeader
        backUrl="/sessions"
        title={session.title}
        subtitle={session.description}
        pill={<CornerPillBadge>{session.status}</CornerPillBadge>}
        actions={
          isStaff && (
            <div className="flex gap-2">
              {session.status === "draft" || session.status === "scheduled" ? (
                <Button
                  onClick={() => {
                    setMeetUrlInput(session.googleMeetUrl || "");
                    setShowStartModal(true);
                  }}
                  className="bg-accent-teal hover:bg-accent-teal-bright"
                >
                  <Play className="h-4 w-4 mr-1" /> Start
                </Button>
              ) : null}
              {session.status === "active" && (
                <>
                  {session.sessionType !== "podcast" && (
                    <Button asChild className="bg-accent-teal hover:bg-accent-teal-bright">
                      <Link to="/sessions/$id/evaluate" params={{ id }}>
                        Evaluate
                      </Link>
                    </Button>
                  )}
                  <Button variant="outline" onClick={end} disabled={loadingEnd}>
                    <Square className="h-4 w-4 mr-1" /> {loadingEnd ? "Ending..." : "End"}
                  </Button>
                </>
              )}
              {session.status === "completed" && (
                <>
                  {session.sessionType !== "podcast" ? (
                    <>
                      <Button asChild variant="outline">
                        <Link to="/sessions/$id/evaluations" params={{ id }}>
                          View evaluations
                        </Link>
                      </Button>
                      <Button asChild className="bg-accent-teal hover:bg-accent-teal-bright">
                        <Link to="/sessions/$id/evaluations/review" params={{ id }}>
                          Review publish
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <Button 
                      onClick={async () => {
                        try {
                          await apiPatch(`/sessions/${id}`, { status: 'published' });
                          toast.success("Podcast published successfully!");
                          reload();
                        } catch (e) {
                          toast.error(e instanceof ApiError ? e.message : "Failed to publish");
                        }
                      }}
                      className="bg-accent-teal hover:bg-accent-teal-bright text-white"
                    >
                      Publish Podcast
                    </Button>
                  )}
                </>
              )}
              {session.status === "draft" && (
                <Button variant="ghost" onClick={remove} disabled={loadingDelete}
                  className="text-accent-red hover:text-accent-red">
                  {loadingDelete ? "Deleting..." : <Trash2 className="h-4 w-4" />}
                </Button>
              )}
            </div>
          )
        }
      />

      <section className="bg-surface-light border border-hairline-light rounded-2xl p-6 mb-6 shadow-elegant">
        <h2 className="font-display text-lg font-semibold mb-5">Lifecycle</h2>
        <div className="flex items-center flex-wrap gap-2">
          {lifecycle.map((step, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            return (
              <div key={step.key} className="flex items-center">
                <div className="flex flex-col items-center min-w-[96px]">
                  <IconCircle
                    step={i + 1}
                    tone={done || active ? "teal" : "dark"}
                  >
                    <span className="text-xs font-bold">{step.label[0]}</span>
                  </IconCircle>
                  <div
                    className={
                      "text-[11px] mt-2 font-medium uppercase tracking-wider " +
                      (active
                        ? "text-accent-teal"
                        : done
                          ? "text-text-on-light"
                          : "text-text-muted-light")
                    }
                  >
                    {step.label}
                  </div>
                </div>
                {i < lifecycle.length - 1 && (
                  <div
                    className={
                      "hidden md:block h-[2px] w-10 rounded-full mx-1 transition-all " +
                      (done
                        ? "bg-gradient-teal shadow-[0_0_8px_rgba(20,184,166,0.5)]"
                        : "bg-hairline-light")
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <SessionInfoPanel
            session={session}
            isStaff={isStaff}
            onRescheduleClick={() => {
              let localTime = "";
              if (session.scheduledAt) {
                const date = new Date(session.scheduledAt);
                const tzOffset = date.getTimezoneOffset() * 60000;
                localTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
              }
              setNewDateInput(localTime);
              setNewDurationInput(session.durationMins || 45);
              setShowRescheduleModal(true);
            }}
            onEditClick={openEditModal}
          />
          <JoinCodePanel session={session} />
          {role === "student" && !!session.joinCode && (session.status === "completed" || session.status === "published") && (
            <StudentFeedbackPanel session={session} />
          )}
          {session.googleMeetUrl && (
            <GoogleMeetPanel session={session} isStaff={isStaff} reload={reload} />
          )}
          <AttachmentsPanel
            attachments={attachments}
            error={attachmentsError}
            isStaff={isStaff}
            onAddClick={() => setShowAttachmentModal(true)}
            onDeleteClick={handleDeleteAttachment}
            deletingAttachmentId={deletingAttachmentId}
          />
        </div>
        <ParticipantsPanel sessionId={id} canManage={isStaff} sessionTitle={session?.title} />
      </div>

      {showStartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-hairline-light rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-accent-teal to-accent-teal-bright" />
            
            <div className="space-y-2">
              <h3 className="font-display text-xl font-bold text-text-on-light">
                Verify Google Meet Setup
              </h3>
              <p className="text-sm text-text-muted-light">
                Please make sure you have started the Google Meet call before beginning the session. Students will access this link to join the GD.
              </p>
            </div>

            {/* Premium warning notification */}
            <div className="bg-amber-50/80 border border-amber-200/60 text-amber-900 rounded-xl p-3.5 text-xs space-y-1.5 leading-relaxed shadow-sm">
              <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                <span>⚠️</span> Note on Google Meet links
              </div>
              <p className="text-amber-700">
                The default link is a simulated placeholder. If you click it, Google Meet will show a <strong>"Check your meeting code"</strong> error.
              </p>
              <p className="text-amber-700">
                To host a real Group Discussion, create a meeting on{" "}
                <a href="https://meet.google.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-amber-900">
                  Google Meet
                </a>{" "}
                and paste your real URL below.
              </p>
            </div>

            <div className="bg-surface-light rounded-xl p-4 border border-hairline-light space-y-3 text-left">
              <div className="text-[11px] font-bold uppercase tracking-wider text-accent-teal">
                Google Meet Room Link
              </div>
              <div className="flex gap-2">
                <Input
                  value={meetUrlInput}
                  onChange={(e) => setMeetUrlInput(e.target.value)}
                  placeholder="Paste real Google Meet link here..."
                  className="flex-1 text-sm bg-white"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (meetUrlInput) {
                      navigator.clipboard.writeText(meetUrlInput);
                      toast.success("Copied Meet URL");
                    }
                  }}
                  className="flex-shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={generateMeetLink}
                disabled={loadingMeet}
                className="w-full text-xs border-accent-teal text-accent-teal hover:bg-accent-teal/5 flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" /> {loadingMeet ? "Generating..." : "Generate Google Meet URL"}
              </Button>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <a
                href={meetUrlInput || "https://meet.google.com"}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center"
              >
                <Button className="w-full bg-accent-teal hover:bg-accent-teal-bright text-white flex items-center justify-center gap-2">
                  <Play className="h-4 w-4" /> Launch Google Meet
                </Button>
              </a>
              <Button
                onClick={startAndRedirect}
                disabled={loadingStart}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white"
              >
                {loadingStart ? "Starting..." : "Continue to Evaluation"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowStartModal(false)}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-hairline-light rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-accent-teal to-accent-teal-bright" />
            <div className="space-y-2">
              <h3 className="font-display text-xl font-bold text-text-on-light">
                Reschedule GD Session
              </h3>
              <p className="text-sm text-text-muted-light">
                Update the session timing. Subscribed participants will automatically receive an email alert with the new details.
              </p>
            </div>

            <form onSubmit={handleReschedule} className="space-y-4">
              <div>
                <Label htmlFor="newScheduledAt">New Scheduled Date & Time</Label>
                <Input
                  id="newScheduledAt"
                  type="datetime-local"
                  required
                  value={newDateInput}
                  onChange={(e) => setNewDateInput(e.target.value)}
                  className="bg-white"
                />
              </div>

              <div>
                <Label htmlFor="newDuration">Duration (minutes)</Label>
                <Input
                  id="newDuration"
                  type="number"
                  required
                  min={15}
                  max={180}
                  value={newDurationInput}
                  onChange={(e) => setNewDurationInput(Number(e.target.value))}
                  className="bg-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={loadingReschedule}
                  className="flex-1 bg-accent-teal hover:bg-accent-teal-bright text-white"
                >
                  {loadingReschedule ? "Rescheduling..." : "Reschedule Session"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRescheduleModal(false)}
                  disabled={loadingReschedule}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-hairline-light rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-accent-teal to-accent-teal-bright" />
            <div className="space-y-2">
              <h3 className="font-display text-xl font-bold text-text-on-light">
                Edit GD Session
              </h3>
              <p className="text-sm text-text-muted-light">
                Update the session title, description, topic, and co-instructors.
              </p>
            </div>

            <form onSubmit={handleEditSession} className="space-y-4">
              <div>
                <Label htmlFor="editTitle">Title</Label>
                <Input
                  id="editTitle"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="bg-white"
                />
              </div>

              <div>
                <Label htmlFor="editDesc">Description</Label>
                <Textarea
                  id="editDesc"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="bg-white"
                />
              </div>

              <div>
                <Label htmlFor="editTopic">Topic</Label>
                <Input
                  id="editTopic"
                  value={editTopic}
                  onChange={(e) => setEditTopic(e.target.value)}
                  className="bg-white"
                />
              </div>

              <div 
                className="relative"
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    setEditCoOpen(false);
                  }
                }}
              >
                <Label>Co-Instructors (Optional)</Label>
                <button
                  type="button"
                  onClick={() => setEditCoOpen(!editCoOpen)}
                  className="w-full flex items-center justify-between mt-1 px-3 py-2 border rounded-lg bg-white text-sm text-left text-text-on-light focus:outline-none focus:ring-1 focus:ring-accent-teal"
                >
                  <span>
                    {editCoInstructors.length === 0
                      ? "Select co-instructors..."
                      : `${editCoInstructors.length} selected`}
                  </span>
                  <span className="text-xs text-text-muted-light">▼</span>
                </button>

                {editCoOpen && (
                  <div className="absolute z-30 left-0 right-0 mt-1 border border-input rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-white shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
                    {instructorsLoading ? (
                      <LoadingSection rows={2} />
                    ) : (
                      <>
                        {(instructors || [])
                          .filter((inst) => inst._id !== (session?.instructorId?._id || session?.instructorId || user?._id))
                          .map((inst) => {
                            const checked = editCoInstructors.includes(inst._id);
                            return (
                              <div key={inst._id} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`edit-co-${inst._id}`}
                                  checked={checked}
                                  onChange={(e) => {
                                    const nextCo = e.target.checked
                                      ? [...editCoInstructors, inst._id]
                                      : editCoInstructors.filter((id) => id !== inst._id);
                                    setEditCoInstructors(nextCo);
                                  }}
                                  className="h-4 w-4 rounded border-gray-300 text-accent-teal focus:ring-accent-teal cursor-pointer accent-accent-teal"
                                />
                                <label htmlFor={`edit-co-${inst._id}`} className="text-sm text-text-on-light cursor-pointer select-none">
                                  {inst.name} ({inst.email})
                                </label>
                              </div>
                            );
                          })}
                        {(instructors || []).filter((inst) => inst._id !== (session?.instructorId?._id || session?.instructorId || user?._id)).length === 0 && (
                          <p className="text-xs text-text-muted-light">No other verified instructors available.</p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={loadingEdit}
                  className="flex-1 bg-accent-teal hover:bg-accent-teal-bright text-white"
                >
                  {loadingEdit ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                  disabled={loadingEdit}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAttachmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-hairline-light rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-accent-teal to-accent-teal-bright" />
            <div className="space-y-2">
              <h3 className="font-display text-xl font-bold text-text-on-light">
                Add Attachment
              </h3>
              <p className="text-sm text-text-muted-light">
                Add resources, documents, or websites that registered students can download and refer to.
              </p>
            </div>

            <form onSubmit={handleAddAttachment} className="space-y-4">
              <div>
                <Label htmlFor="attTitle">Title</Label>
                <Input
                  id="attTitle"
                  placeholder="e.g. Study Material PDF"
                  required
                  value={attTitle}
                  onChange={(e) => setAttTitle(e.target.value)}
                  className="bg-white"
                />
              </div>

              <div>
                <Label htmlFor="attDesc">Description (Optional)</Label>
                <Input
                  id="attDesc"
                  placeholder="Brief description of the handout..."
                  value={attDesc}
                  onChange={(e) => setAttDesc(e.target.value)}
                  className="bg-white"
                />
              </div>

              <div>
                <Label htmlFor="attFile">Upload File</Label>
                <Input
                  id="attFile"
                  type="file"
                  required
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
                  onChange={(e) => setAttFile(e.target.files?.[0] || null)}
                  className="bg-white cursor-pointer"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={loadingAttachment}
                  className="flex-1 bg-accent-teal hover:bg-accent-teal-bright text-white"
                >
                  {loadingAttachment ? "Uploading..." : "Add Attachment"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAttachmentModal(false)}
                  disabled={loadingAttachment}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function GoogleMeetPanel({
  session,
  isStaff,
  reload,
}: {
  session: Session;
  isStaff: boolean;
  reload: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [urlInput, setUrlInput] = useState(session.googleMeetUrl || "");
  const [loading, setLoading] = useState(false);

  const copy = () => {
    if (!session.googleMeetUrl) return;
    navigator.clipboard.writeText(session.googleMeetUrl);
    toast.success("Copied Google Meet URL");
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await apiPatch(`/sessions/${session._id}`, { googleMeetUrl: urlInput });
      toast.success("Google Meet URL updated");
      setIsEditing(false);
      reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to update URL");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-white border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-semibold flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-accent-teal animate-pulse" />
          Google Meet Room
        </h2>
        {isStaff && !isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setUrlInput(session.googleMeetUrl || "");
              setIsEditing(true);
            }}
            className="text-xs text-accent-teal hover:text-accent-teal-bright"
          >
            Edit Link
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3 text-left">
          <div className="flex gap-2">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste real Google Meet link here..."
              className="flex-1 text-sm bg-white"
            />
            <Button
              onClick={handleSave}
              disabled={loading}
              className="bg-accent-teal hover:bg-accent-teal-bright text-white"
            >
              {loading ? "Saving..." : "Save"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              setLoading(true);
              try {
                const resp = await apiPost<{ session: Session }>(`/sessions/${session._id}/google-meet`);
                const newUrl = resp.session?.googleMeetUrl || "";
                setUrlInput(newUrl);
                toast.success("Successfully generated Google Meet URL!");
                setIsEditing(false);
                reload();
              } catch (e) {
                toast.error(e instanceof ApiError ? e.message : "Failed to generate Google Meet URL.");
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="text-xs border-accent-teal text-accent-teal hover:bg-accent-teal/5 flex items-center justify-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Generate Google Meet URL
          </Button>
          <p className="text-[11px] text-text-muted-light">
            Paste a valid Google Meet link (e.g. https://meet.google.com/abc-defg-hij) or generate one using the central Google Calendar account.
          </p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <a
            href={session.googleMeetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-surface-light hover:bg-slate-100 border text-accent-teal hover:text-accent-teal-bright font-medium px-4 py-2.5 rounded-lg text-sm transition-colors break-all truncate flex items-center justify-between"
          >
            <span>{session.googleMeetUrl}</span>
          </a>
          <div className="flex gap-2">
            <Button variant="outline" onClick={copy}>
              <Copy className="h-4 w-4" />
            </Button>
            <a href={session.googleMeetUrl} target="_blank" rel="noopener noreferrer">
              <Button className="bg-accent-teal hover:bg-accent-teal-bright text-white">
                Join Meet
              </Button>
            </a>
          </div>
        </div>
      )}
      <p className="text-xs text-text-muted-light mt-3">
        {isStaff
          ? "Ensure your microphone and camera are ready before starting the evaluation."
          : "Join the video call using this link when the session starts."}
      </p>
    </section>
  );
}

function JoinCodePanel({ session }: { session: Session }) {
  const { role } = useAuth();
  const copy = () => {
    if (!session.joinCode) return;
    navigator.clipboard.writeText(session.joinCode);
    toast.success("Copied join code");
  };
  return (
    <section className="bg-white border rounded-2xl p-5">
      <h2 className="font-display font-semibold mb-3">Join code</h2>
      {session.joinCode ? (
        <div className="flex items-center gap-3">
          <code className="text-3xl font-bold tracking-widest text-accent-teal bg-surface-light px-4 py-2 rounded-lg">
            {session.joinCode}
          </code>
          <Button variant="outline" onClick={copy}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <p className="text-text-muted-light text-sm">
          {role === "student" ? (
            <span className="flex items-center gap-1.5 text-amber-600 font-medium">
              🔑 Join details are locked. Register to view details.
            </span>
          ) : (
            "No join code yet."
          )}
        </p>
      )}
      {session.requiresPayment && (
        <p className="text-xs text-text-muted-light mt-3">
          Students will pay {session.currency} {session.price} on join.
        </p>
      )}
    </section>
  );
}

function ParticipantsPanel({
  sessionId,
  canManage,
  sessionTitle,
}: {
  sessionId: string;
  canManage: boolean;
  sessionTitle?: string;
}) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["session", sessionId, "participants"],
    queryFn: async () => {
      const resp = await apiGet<{ participants: any[]; total: number }>(
        `/sessions/${sessionId}/participants`,
      );
      return (resp.data.participants || []).map((p) => ({
        userId: p.studentId?._id || p.studentId,
        name: p.studentId?.name || "Unknown",
        email: p.studentId?.email || "",
        paymentStatus: p.isPaid ? "paid" : "pending",
        status: p.status,
        invitedAt: p.invitedAt,
        registeredAt: p.registeredAt,
        attendedAt: p.attendedAt,
      }));
    },
  });

  const handleExportCSV = () => {
    if (!data || data.length === 0) {
      toast.error("No participants to export");
      return;
    }

    const headers = [
      "Student Name",
      "Student Email",
      "Participation Status",
      "Payment Status",
      "Invited At",
      "Registered At",
      "Attended At",
    ];

    const rows = data.map((p) => [
      p.name || "",
      p.email || "",
      p.status || "",
      p.paymentStatus || "",
      p.invitedAt ? new Date(p.invitedAt).toLocaleString() : "",
      p.registeredAt ? new Date(p.registeredAt).toLocaleString() : "",
      p.attendedAt ? new Date(p.attendedAt).toLocaleString() : "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((val) => {
            const escaped = String(val).replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);

    const sanitizedTitle = (sessionTitle || "session")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_+|_+$)/g, "");
    link.setAttribute("download", `${sanitizedTitle}_participants.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Excel/CSV export completed!");
  };
  const [email, setEmail] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const search = async (q: string) => {
    setEmail(q);
    if (q.length < 2) { setResults([]); return; }
    try {
      const { data: users } = await apiGet<User[]>(`/users?q=${encodeURIComponent(q)}`);
      setResults(users || []);
    } catch { setResults([]); }
  };
  const add = async (userId: string) => {
    setAddingUserId(userId);
    try {
      await apiPost(`/sessions/${sessionId}/participants`, { userId });
      toast.success("Added");
      setEmail(""); setResults([]);
      qc.invalidateQueries({ queryKey: ["session", sessionId, "participants"] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed");
    } finally {
      setAddingUserId(null);
    }
  };

  return (
    <section className="bg-white border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-semibold flex items-center gap-2">
          <UsersIcon className="h-4 w-4" /> Participants
        </h2>
        {canManage && data && data.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs border-accent-teal text-accent-teal hover:bg-accent-teal/5 flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> Export Excel
          </Button>
        )}
      </div>
      <ul className="divide-y mb-4">
        {(data || []).map((p) => (
          <li key={p.userId} className="py-2 flex items-center justify-between text-sm">
            <div>
              <div className="font-medium">{p.name || p.userId}</div>
              <div className="text-xs text-text-muted-light">{p.email}</div>
            </div>
            {p.paymentStatus && p.paymentStatus !== "not_required" && (
              <CornerPillBadge tone={p.paymentStatus === "paid" ? "teal" : "amber"}>
                {p.paymentStatus}
              </CornerPillBadge>
            )}
          </li>
        ))}
        {!data?.length && (
          <li className="py-3 text-sm text-text-muted-light">No participants yet.</li>
        )}
      </ul>
      {canManage && (
        <div className="relative">
          <Input placeholder="Search users by name or email…"
            value={email} onChange={(e) => search(e.target.value)} />
          {!!results.length && (
            <div className="absolute z-10 bg-white border rounded-lg w-full mt-1 max-h-60 overflow-y-auto shadow-lg">
              {results.map((u) => (
                <button key={u._id} onClick={() => add(u._id)}
                  disabled={addingUserId === u._id}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-surface-light">
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-text-muted-light">
                    {addingUserId === u._id ? "Adding..." : u.email}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function SessionInfoPanel({
  session,
  isStaff,
  onRescheduleClick,
  onEditClick,
}: {
  session: Session;
  isStaff: boolean;
  onRescheduleClick: () => void;
  onEditClick: () => void;
}) {
  const now = new Date();
  const scheduledTime = session.scheduledAt ? new Date(session.scheduledAt) : null;
  const canReschedule =
    isStaff &&
    (session.status === "draft" ||
      (session.status === "scheduled" &&
        scheduledTime &&
        scheduledTime.getTime() - now.getTime() > 30 * 60 * 1000));
  const canEdit = isStaff && (session.status === "draft" || session.status === "scheduled");

  return (
    <section className="bg-white border rounded-2xl p-5 shadow-sm space-y-4 text-left">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-text-on-light flex items-center gap-2">
          <Calendar className="h-4 w-4 text-accent-teal" /> Session Details
        </h2>
        <div className="flex gap-2">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEditClick}
              className="text-xs text-accent-teal border-accent-teal hover:bg-accent-teal/5"
            >
              Edit
            </Button>
          )}
          {canReschedule && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRescheduleClick}
              className="text-xs text-accent-teal border-accent-teal hover:bg-accent-teal/5"
            >
              Reschedule
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm text-left">
        {/* Session Type Badge */}
        <div>
          <span className="text-xs text-text-muted-light font-semibold block uppercase tracking-wider">Type</span>
          <span className={`inline-block mt-1 px-2.5 py-0.5 text-xs font-bold rounded-full uppercase tracking-wider ${
            session.sessionType === "personal_interview"
              ? "bg-purple-100 text-purple-700"
              : session.sessionType === "podcast"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-sky-100 text-sky-700"
          }`}>
            {session.sessionType === "personal_interview" ? "Personal Interview" : session.sessionType === "podcast" ? "Podcast" : "Group Discussion"}
          </span>
        </div>
        {/* Seats */}
        <div>
          <span className="text-xs text-text-muted-light font-semibold block uppercase tracking-wider">Seats</span>
          <span className={`font-medium ${
            session.maxParticipants && (session.participantCount ?? 0) >= session.maxParticipants
              ? "text-red-600"
              : "text-text-on-light"
          }`}>
            {session.participantCount ?? 0} / {session.maxParticipants ?? "∞"}
            {session.maxParticipants && (session.participantCount ?? 0) >= session.maxParticipants && (
              <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded-full uppercase">Full</span>
            )}
          </span>
        </div>
        <div>
          <span className="text-xs text-text-muted-light font-semibold block uppercase tracking-wider">Scheduled At</span>
          <span className="font-medium text-text-on-light">
            {session.scheduledAt ? new Date(session.scheduledAt).toLocaleString() : "Not Scheduled"}
          </span>
        </div>
        <div>
          <span className="text-xs text-text-muted-light font-semibold block uppercase tracking-wider">Duration</span>
          <span className="font-medium text-text-on-light">{session.durationMins || 45} minutes</span>
        </div>
        <div className="col-span-2 border-t border-hairline-light pt-3">
          <span className="text-xs text-text-muted-light font-semibold block uppercase tracking-wider">Topic</span>
          <span className="font-medium text-text-on-light">{session.topic || "No topic set"}</span>
        </div>
        {session.instructorId && (
          <div className="col-span-2 border-t border-hairline-light pt-3">
            <span className="text-xs text-text-muted-light font-semibold block uppercase tracking-wider">Instructor</span>
            <span className="font-medium text-text-on-light">
              {session.instructorId.name} ({session.instructorId.email})
            </span>
          </div>
        )}
        {session.coInstructors && session.coInstructors.length > 0 && (
          <div className="col-span-2 border-t border-hairline-light pt-3">
            <span className="text-xs text-text-muted-light font-semibold block uppercase tracking-wider">Co-Instructors</span>
            <div className="flex flex-col gap-1 mt-1">
              {session.coInstructors.map((co: any) => (
                <span key={co._id} className="font-medium text-text-on-light text-sm">
                  {co.name} ({co.email})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function AttachmentsPanel({
  attachments,
  error,
  isStaff,
  onAddClick,
  onDeleteClick,
  deletingAttachmentId,
}: {
  attachments: Attachment[];
  error: any;
  isStaff: boolean;
  onAddClick: () => void;
  onDeleteClick: (id: string) => void;
  deletingAttachmentId?: string | null;
}) {
  const isLocked = error instanceof ApiError && error.status === 403;

  if (isLocked) {
    return (
      <section className="bg-white border rounded-2xl p-5 shadow-sm text-left">
        <h2 className="font-display font-semibold mb-3 flex items-center gap-2 text-text-on-light">
          <Paperclip className="h-4 w-4" /> Attachments
        </h2>
        <div className="bg-slate-50 border border-dashed rounded-xl p-6 text-center space-y-3">
          <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
            <Lock className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-semibold text-text-on-light">Attachments Locked</h4>
          <p className="text-xs text-text-muted-light max-w-sm mx-auto">
            You must be registered/subscribed to this Group Discussion session to access files and handouts.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white border rounded-2xl p-5 shadow-sm text-left">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-semibold flex items-center gap-2 text-text-on-light">
          <Paperclip className="h-4 w-4 text-accent-teal" /> Attachments
        </h2>
        {isStaff && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAddClick}
            className="text-xs text-accent-teal border-accent-teal hover:bg-accent-teal/5 flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Add Attachment
          </Button>
        )}
      </div>

      {attachments.length > 0 ? (
        <ul className="space-y-3">
          {attachments.map((att) => (
            <li
              key={att._id}
              className="flex items-center justify-between p-3 rounded-xl border border-hairline-light hover:border-accent-teal/40 transition group bg-surface-light"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center text-accent-teal shrink-0">
                  {att.fileType?.toLowerCase() === "link" ? (
                    <LinkIcon className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <a
                    href={att.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:text-accent-teal truncate block"
                  >
                    {att.title}
                  </a>
                  {att.description && (
                    <p className="text-xs text-text-muted-light line-clamp-1">
                      {att.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 ml-3 shrink-0">
                <a href={att.fileUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-text-muted-light hover:text-accent-teal">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
                {isStaff && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteClick(att._id)}
                    disabled={deletingAttachmentId === att._id}
                    className="h-8 w-8 p-0 text-text-muted-light hover:text-accent-red"
                  >
                    {deletingAttachmentId === att._id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-xs text-text-muted-light py-6 text-center bg-slate-50 border border-dashed rounded-xl">
          No attachments uploaded for this session yet.
        </div>
      )}
    </section>
  );
}

function StudentFeedbackPanel({ session }: { session: Session }) {
  const { id } = Route.useParams();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: feedbackData, refetch } = useQuery({
    queryKey: ["session", id, "my-feedback"],
    queryFn: async () => (await apiGet<{ feedbacks: any[] }>(`/feedback/sessions/${id}/feedback`)).data,
  });

  const myFeedback = feedbackData?.feedbacks?.[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a rating between 1 and 5 stars.");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost(`/feedback/sessions/${id}/feedback`, { rating, comment });
      toast.success("Thank you for your feedback!");
      refetch();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="bg-white border rounded-2xl p-5 shadow-sm text-left space-y-4">
      <h2 className="font-display font-semibold text-text-on-light flex items-center gap-2">
        <Star className="h-5 w-5 text-amber-500 fill-amber-500" /> Session Feedback
      </h2>

      {myFeedback ? (
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-emerald-800">
            Thank you! Your feedback has been received.
          </p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`h-4 w-4 ${
                  s <= myFeedback.rating
                    ? "text-amber-500 fill-amber-500"
                    : "text-slate-200"
                }`}
              />
            ))}
            <span className="ml-1 text-xs text-text-muted-light font-medium">
              (Rated {myFeedback.rating} / 5)
            </span>
          </div>
          {myFeedback.comment && (
            <p className="text-xs text-text-muted-dark italic bg-white border rounded-lg p-2.5 mt-1.5">
              "{myFeedback.comment}"
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-text-muted-light">
            Share your thoughts to help us improve the PrepLyt session experience!
          </p>

          <div className="space-y-1.5">
            <span className="text-xs text-text-muted-dark font-medium block">Rating</span>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => {
                const active = s <= (hoverRating || rating);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    onMouseEnter={() => setHoverRating(s)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 hover:scale-110 transition cursor-pointer"
                  >
                    <Star
                      className={`h-7 w-7 transition-colors ${
                        active
                          ? "text-amber-500 fill-amber-500"
                          : "text-slate-200"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="feedback-comment">Comments (Optional)</Label>
            <Textarea
              id="feedback-comment"
              placeholder="What went well? What could be improved?"
              maxLength={500}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="text-xs bg-slate-50 border-slate-200 focus:bg-white resize-none"
              rows={3}
            />
            <div className="text-[10px] text-right text-text-muted-light">
              {comment.length} / 500 characters
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-accent-teal hover:bg-accent-teal-bright text-white text-xs py-2"
          >
            {submitting ? "Submitting..." : "Submit Feedback"}
          </Button>
        </form>
      )}
    </section>
  );
}
