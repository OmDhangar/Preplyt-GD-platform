import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { apiGet, apiPatch, apiDelete, ApiError } from "@/lib/api";
import type { Template, TemplateField, FieldType } from "@/lib/types";
import { PageHeader } from "@/components/brand/PageHeader";
import { CornerPillBadge } from "@/components/brand/CornerPillBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldRenderer } from "@/components/rubric/FieldRenderer";
import { toast } from "sonner";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

export const Route = createFileRoute("/_app/templates/$id")({
  ssr: false,
  component: TemplateBuilder,
});

const fieldTypes: { value: FieldType; label: string }[] = [
  { value: "number", label: "Number (slider)" },
  { value: "weighted_score", label: "Weighted score" },
  { value: "select", label: "Single select" },
  { value: "multi_select", label: "Multi select" },
  { value: "boolean", label: "Yes / no" },
  { value: "text", label: "Free text" },
];

function newField(): TemplateField {
  return {
    fieldId: `f_${Math.random().toString(36).slice(2, 9)}`,
    label: "New criterion",
    type: "number",
    min: 0,
    max: 10,
    step: 1,
    required: true,
    visibleToStudent: true,
  };
}

function TemplateBuilder() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: templateData } = useQuery({
    queryKey: ["template", id],
    queryFn: async () => (await apiGet<{ template: Template }>(`/templates/${id}`)).data,
  });
  const data = templateData?.template;
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setFields(data.fields || []);
      setName(data.name);
      setDescription(data.description || "");
    }
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      await apiPatch(`/templates/${id}`, { name, description, fields });
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["template", id] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Save failed");
    } finally { setSaving(false); }
  };

  const publish = async () => {
    try {
      await apiPatch(`/templates/${id}/publish`);
      toast.success("Published");
      qc.invalidateQueries({ queryKey: ["template", id] });
    } catch (e) { toast.error(e instanceof ApiError ? e.message : "Failed"); }
  };
  const archive = async () => {
    try {
      await apiPatch(`/templates/${id}/archive`);
      toast.success("Archived");
      qc.invalidateQueries({ queryKey: ["template", id] });
    } catch (e) { toast.error(e instanceof ApiError ? e.message : "Failed"); }
  };
  const remove = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this template? This action cannot be undone.")) return;
    try {
      await apiDelete(`/templates/${id}`);
      toast.success("Template deleted successfully");
      qc.invalidateQueries({ queryKey: ["templates"] });
      navigate({ to: "/templates" });
    } catch (e) { toast.error(e instanceof ApiError ? e.message : "Failed"); }
  };

  const updateField = (idx: number, patch: Partial<TemplateField>) => {
    setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  };
  const removeField = (idx: number) =>
    setFields((prev) => prev.filter((_, i) => i !== idx));
  const move = (idx: number, dir: -1 | 1) => {
    setFields((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  if (!data) return <div className="text-text-muted-light">Loading…</div>;

  return (
    <div>
      <PageHeader
        title={name || "Template"}
        subtitle="build your evaluation rubric"
        pill={<CornerPillBadge tone={data.status === "published" ? "teal" : "dark"}>
          {data.status}
        </CornerPillBadge>}
        actions={
          <div className="flex gap-2">
            <Button variant="destructive" onClick={remove}>Delete</Button>
            <Button variant="outline" onClick={archive}>Archive</Button>
            <Button onClick={publish}
              className="bg-accent-teal hover:bg-accent-teal-bright">
              Publish
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border rounded-2xl p-5 space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={description}
              onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="flex items-center justify-between mt-4">
            <h3 className="font-display font-semibold">Fields</h3>
            <Button size="sm" variant="outline"
              onClick={() => setFields((p) => [...p, newField()])}>
              <Plus className="h-4 w-4 mr-1" /> Add field
            </Button>
          </div>

          <ul className="space-y-3">
            {fields.map((f, idx) => (
              <li key={f.fieldId} className="border rounded-xl p-3 bg-surface-light/40">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                  <Input value={f.label}
                    onChange={(e) => updateField(idx, { label: e.target.value })}
                    className="font-medium" />
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select value={f.type}
                      onValueChange={(v) => updateField(idx, { type: v as FieldType })}>
                      <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {fieldTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1 ml-auto sm:ml-0 shrink-0">
                      <button onClick={() => move(idx, -1)} className="p-1.5 text-text-muted-light hover:text-accent-teal cursor-pointer">
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button onClick={() => move(idx, 1)} className="p-1.5 text-text-muted-light hover:text-accent-teal cursor-pointer">
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button onClick={() => removeField(idx)} className="p-1.5 text-accent-red cursor-pointer">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <Input placeholder="Help text (optional)"
                  value={f.description || ""}
                  onChange={(e) => updateField(idx, { description: e.target.value })}
                  className="mb-2 text-sm" />

                {(f.type === "number" || f.type === "weighted_score") && (
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {f.type === "number" && (
                      <>
                        <LabeledNum label="Min" value={f.min}
                          onChange={(v) => updateField(idx, { min: v })} />
                        <LabeledNum label="Max" value={f.max}
                          onChange={(v) => updateField(idx, { max: v })} />
                      </>
                    )}
                    {f.type === "weighted_score" && (
                      <>
                        <LabeledNum label="Max" value={f.maxScore}
                          onChange={(v) => updateField(idx, { maxScore: v })} />
                        <LabeledNum label="Weight" value={f.weight}
                          onChange={(v) => updateField(idx, { weight: v })} />
                      </>
                    )}
                    <LabeledNum label="Step" value={f.step}
                      onChange={(v) => updateField(idx, { step: v })} />
                  </div>
                )}

                {(f.type === "select" || f.type === "multi_select") && (
                  <Input
                    placeholder="Comma-separated options"
                    value={(f.options || []).join(", ")}
                    onChange={(e) =>
                      updateField(idx, {
                        options: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    className="text-sm"
                  />
                )}

                <div className="flex items-center gap-4 mt-2 text-xs text-text-muted-light">
                  <label className="flex items-center gap-2">
                    <Switch checked={!!f.required}
                      onCheckedChange={(v) => updateField(idx, { required: v })} />
                    Required
                  </label>
                  <label className="flex items-center gap-2">
                    <Switch checked={f.visibleToStudent !== false}
                      onCheckedChange={(v) => updateField(idx, { visibleToStudent: v })} />
                    Visible to student
                  </label>
                </div>
              </li>
            ))}
            {!fields.length && (
              <li className="text-text-muted-light text-sm text-center py-6">
                No fields yet. Click "Add field".
              </li>
            )}
          </ul>
        </section>

        <section className="bg-white border rounded-2xl p-5">
          <h3 className="font-display font-semibold mb-4">Live preview</h3>
          <div className="space-y-5">
            {fields.map((f) => (
              <FieldRenderer key={f.fieldId} field={f} value={undefined} readOnly />
            ))}
            {!fields.length && (
              <div className="text-text-muted-light text-sm text-center py-8">
                Add fields to see a preview.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function LabeledNum({
  label, value, onChange,
}: { label: string; value?: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col">
      <span className="text-text-muted-light mb-1">{label}</span>
      <Input type="number" value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))} className="h-8" />
    </label>
  );
}
