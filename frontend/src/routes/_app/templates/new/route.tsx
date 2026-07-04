import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { apiPost, ApiError } from "@/lib/api";
import type { Template, TemplateField, FieldType } from "@/lib/types";
import { PageHeader } from "@/components/brand/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export const Route = createFileRoute("/_app/templates/new")({
  ssr: false,
  component: NewTemplate,
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

function NewTemplate() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Template name is required.");
      return;
    }
    setLoading(true);
    try {
      const t = await apiPost<{ template: Template }>("/templates", {
        name,
        description,
        fields,
      });
      toast.success("Template created successfully!");
      navigate({ to: "/templates/$id", params: { id: t.template._id } });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create template");
    } finally {
      setLoading(false);
    }
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

  return (
    <div>
      <PageHeader
        backUrl="/templates"
        title="New template"
        subtitle="build your evaluation rubric"
      />

      <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Details & Fields Builder */}
        <section className="bg-white border rounded-2xl p-5 space-y-4 text-left">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Technical Interview Rubric"
              />
            </div>
            <div>
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of when to use this template..."
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <h3 className="font-display font-semibold">Evaluation Criteria (Fields)</h3>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setFields((p) => [...p, newField()])}
            >
              <Plus className="h-4 w-4 mr-1" /> Add field
            </Button>
          </div>

          <ul className="space-y-3">
            {fields.map((f, idx) => (
              <li key={f.fieldId} className="border rounded-xl p-3 bg-surface-light/40">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                  <Input
                    value={f.label}
                    onChange={(e) => updateField(idx, { label: e.target.value })}
                    className="font-medium"
                    placeholder="Criterion label"
                  />
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select
                      value={f.type}
                      onValueChange={(v) => updateField(idx, { type: v as FieldType })}
                    >
                      <SelectTrigger className="w-full sm:w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1 ml-auto sm:ml-0 shrink-0">
                      <button
                        type="button"
                        onClick={() => move(idx, -1)}
                        className="p-1.5 text-text-muted-light hover:text-accent-teal cursor-pointer"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(idx, 1)}
                        className="p-1.5 text-text-muted-light hover:text-accent-teal cursor-pointer"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeField(idx)}
                        className="p-1.5 text-accent-red cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <Input
                  placeholder="Help text (optional)"
                  value={f.description || ""}
                  onChange={(e) => updateField(idx, { description: e.target.value })}
                  className="mb-2 text-sm"
                />

                {(f.type === "number" || f.type === "weighted_score") && (
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {f.type === "number" && (
                      <>
                        <LabeledNum
                          label="Min"
                          value={f.min}
                          onChange={(v) => updateField(idx, { min: v })}
                        />
                        <LabeledNum
                          label="Max"
                          value={f.max}
                          onChange={(v) => updateField(idx, { max: v })}
                        />
                      </>
                    )}
                    {f.type === "weighted_score" && (
                      <>
                        <LabeledNum
                          label="Max"
                          value={f.maxScore}
                          onChange={(v) => updateField(idx, { maxScore: v })}
                        />
                        <LabeledNum
                          label="Weight"
                          value={f.weight}
                          onChange={(v) => updateField(idx, { weight: v })}
                        />
                      </>
                    )}
                    <LabeledNum
                      label="Step"
                      value={f.step}
                      onChange={(v) => updateField(idx, { step: v })}
                    />
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
                    <Switch
                      checked={!!f.required}
                      onCheckedChange={(v) => updateField(idx, { required: v })}
                    />
                    Required
                  </label>
                  <label className="flex items-center gap-2">
                    <Switch
                      checked={f.visibleToStudent !== false}
                      onCheckedChange={(v) => updateField(idx, { visibleToStudent: v })}
                    />
                    Visible to student
                  </label>
                </div>
              </li>
            ))}
            {!fields.length && (
              <li className="text-text-muted-light text-sm text-center py-6 border border-dashed rounded-xl bg-slate-50">
                No fields yet. Click "Add field" to build your rubric.
              </li>
            )}
          </ul>

          <div className="pt-4 border-t">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-accent-teal hover:bg-accent-teal-bright text-white"
            >
              {loading ? "Creating Template..." : "Create Template"}
            </Button>
          </div>
        </section>

        {/* Right Column: Live Preview */}
        <section className="bg-white border rounded-2xl p-5 text-left h-fit sticky top-24">
          <h3 className="font-display font-semibold mb-4">Live Preview</h3>
          <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-2">
            {fields.map((f) => (
              <FieldRenderer key={f.fieldId} field={f} value={undefined} readOnly />
            ))}
            {!fields.length && (
              <div className="text-text-muted-light text-sm text-center py-12 border border-dashed rounded-xl bg-slate-50">
                Add evaluation criteria to see how they render for instructors.
              </div>
            )}
          </div>
        </section>
      </form>
    </div>
  );
}

function LabeledNum({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col">
      <span className="text-text-muted-light mb-1">{label}</span>
      <Input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8"
      />
    </label>
  );
}
