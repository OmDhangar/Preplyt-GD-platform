import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import type { Session, Template, User } from "@/lib/types";
import { PageHeader } from "@/components/brand/PageHeader";
import { LoadingSection } from "@/components/brand/LoadingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/sessions/new")({
  ssr: false,
  component: NewSession,
});

function NewSession() {
  const navigate = useNavigate();
  const { role, user } = useAuth();

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["templates", "published"],
    queryFn: async () =>
      (await apiGet<Template[]>("/templates?status=active")).data,
  });

  const { data: instructors, isLoading: instructorsLoading } = useQuery({
    queryKey: ["users", "instructors", "verified"],
    queryFn: async () => {
      const resp = await apiGet<{ users: User[] }>("/users?role=instructor&limit=1000");
      return (resp.data.users || []).filter((u) => u.isVerified);
    },
    enabled: role === "admin" || (role === "instructor" && !!user?.isVerified),
  });

  const [form, setForm] = useState<{
    title: string;
    description: string;
    templateId: string;
    scheduledAt: string;
    requiresPayment: boolean;
    price: number;
    currency: string;
    googleMeetUrl: string;
    autoCreateMeet: boolean;
    instructorId: string;
    coInstructors: string[];
  }>({
    title: "",
    description: "",
    templateId: "",
    scheduledAt: "",
    requiresPayment: false,
    price: 0,
    currency: "INR",
    googleMeetUrl: "",
    autoCreateMeet: true,
    instructorId: "",
    coInstructors: [],
  });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const created = await apiPost<{ session: Session }>("/sessions", {
        ...form,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
        googleMeetUrl: form.googleMeetUrl || undefined,
        price: form.requiresPayment ? Number(form.price) : undefined,
        autoCreateMeet: form.autoCreateMeet,
        instructorId: form.instructorId || undefined,
      });
      toast.success("Session created");
      navigate({ to: "/sessions/$id", params: { id: created.session._id } });
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) {
        err.details.forEach((d) => toast.error(`${d.field}: ${d.message}`));
      } else {
        toast.error(err instanceof ApiError ? err.message : "Create failed");
      }
    } finally {
      setLoading(false);
    }
  };

  if (role === "instructor" && !user?.isVerified) {
    return (
      <div className="max-w-2xl bg-white border border-amber-200 rounded-2xl p-8 text-center space-y-4 shadow-elegant mt-6">
        <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-xl">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-text-on-light">Verification Required</h2>
        <p className="text-sm text-text-muted-light max-w-md mx-auto">
          Your instructor account is pending administrator verification. You will be able to create new group discussion sessions once your account is fully verified.
        </p>
        <Button asChild className="bg-accent-teal hover:bg-accent-teal-bright text-white">
          <Link to="/dashboard">Go back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        backUrl="/sessions"
        title="New session"
        subtitle="set up a group discussion"
      />
      <form onSubmit={submit} className="bg-white border rounded-2xl p-6 space-y-4">
        {role === "admin" && (
          <div>
            <Label htmlFor="instructorId">Assign Instructor</Label>
            {instructorsLoading ? (
              <div className="mt-2">
                <LoadingSection rows={1} />
              </div>
            ) : (
            <Select
              value={form.instructorId}
              onValueChange={(v) => setForm({ ...form, instructorId: v, coInstructors: form.coInstructors.filter((id) => id !== v) })}
            >
              <SelectTrigger id="instructorId">
                <SelectValue placeholder="Select verified instructor" />
              </SelectTrigger>
              <SelectContent>
                {(instructors || []).map((inst) => (
                  <SelectItem key={inst._id} value={inst._id}>
                    {inst.name} ({inst.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            )}
          </div>
        )}
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" required value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <Label>Template</Label>
          {templatesLoading ? (
            <div className="mt-2">
              <LoadingSection rows={1} />
            </div>
          ) : (
          <Select value={form.templateId}
            onValueChange={(v) => setForm({ ...form, templateId: v })}>
            <SelectTrigger><SelectValue placeholder="Choose a template" /></SelectTrigger>
            <SelectContent>
              {(templates || []).map((t) => (
                <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          )}
        </div>
        <div>
          <Label>Co-Instructors (Optional)</Label>
          {instructorsLoading ? (
            <div className="mt-2">
              <LoadingSection rows={2} />
            </div>
          ) : (
            <div className="mt-2 border border-input rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-white">
              {(instructors || [])
                .filter((inst) => inst._id !== (form.instructorId || user?._id))
                .map((inst) => {
                  const checked = form.coInstructors.includes(inst._id);
                  return (
                    <div key={inst._id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`co-${inst._id}`}
                        checked={checked}
                        onChange={(e) => {
                          const nextCo = e.target.checked
                            ? [...form.coInstructors, inst._id]
                            : form.coInstructors.filter((id) => id !== inst._id);
                          setForm({ ...form, coInstructors: nextCo });
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-accent-teal focus:ring-accent-teal cursor-pointer accent-accent-teal"
                      />
                      <label htmlFor={`co-${inst._id}`} className="text-sm text-text-on-light cursor-pointer select-none">
                        {inst.name} ({inst.email})
                      </label>
                    </div>
                  );
                })}
              {(instructors || []).filter((inst) => inst._id !== (form.instructorId || user?._id)).length === 0 && (
                <p className="text-xs text-text-muted-light">No other verified instructors available.</p>
              )}
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="when">Scheduled at</Label>
          <Input id="when" type="datetime-local" value={form.scheduledAt}
            onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="meet">Google Meet URL</Label>
          <Input id="meet" placeholder="e.g. https://meet.google.com/abc-defg-hij"
            disabled={form.autoCreateMeet}
            value={form.autoCreateMeet ? "(Auto-generated on creation)" : form.googleMeetUrl}
            onChange={(e) => setForm({ ...form, googleMeetUrl: e.target.value })} />
          <p className="text-[11px] text-text-muted-light mt-1">
            {form.autoCreateMeet
              ? "A real Google Meet URL will be created and added to this session automatically."
              : "If left blank, a mock development Meet link will be generated automatically."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={form.autoCreateMeet}
            onCheckedChange={(v) => setForm({ ...form, autoCreateMeet: v })} />
          <Label>Auto-generate Google Meet URL via Calendar</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={form.requiresPayment}
            onCheckedChange={(v) => setForm({ ...form, requiresPayment: v })} />
          <Label>Requires payment</Label>
        </div>
        {form.requiresPayment && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="price">Price</Label>
              <Input id="price" type="number" min={0} value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            </div>
            <div>
              <Label htmlFor="curr">Currency</Label>
              <Input id="curr" value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            </div>
          </div>
        )}
        <Button type="submit" disabled={loading || templatesLoading || instructorsLoading}
          className="bg-accent-teal hover:bg-accent-teal-bright">
          {loading ? "Creating…" : "Create session"}
        </Button>
      </form>
    </div>
  );
}
