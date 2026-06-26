import type { TemplateField } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Props {
  field: TemplateField;
  value: unknown;
  onChange?: (value: unknown) => void;
  readOnly?: boolean;
}

export function FieldRenderer({ field, value, onChange, readOnly }: Props) {
  const id = `f-${field.fieldId}`;
  const disabled = readOnly || !onChange;

  const inner = () => {
    switch (field.type) {
      case "number": {
        const min = field.min ?? 0;
        const max = field.max ?? 10;
        const v = typeof value === "number" ? value : min;
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-text-muted-light">
              <span>{min}</span>
              <span className="font-semibold text-accent-teal">{v}</span>
              <span>{max}</span>
            </div>
            <Slider
              id={id}
              min={min}
              max={max}
              step={field.step ?? 1}
              value={[v]}
              disabled={disabled}
              onValueChange={(arr) => onChange?.(arr[0])}
            />
          </div>
        );
      }
      case "weighted_score": {
        const max = field.maxScore ?? 10;
        const v = typeof value === "number" ? value : 0;
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-text-muted-light">
              <span>0</span>
              <span className="font-semibold text-accent-teal">
                {v} × weight {field.weight ?? 1}
              </span>
              <span>{max}</span>
            </div>
            <Slider
              id={id}
              min={0}
              max={max}
              step={field.step ?? 1}
              value={[v]}
              disabled={disabled}
              onValueChange={(arr) => onChange?.(arr[0])}
            />
          </div>
        );
      }
      case "select":
        return (
          <Select
            value={typeof value === "string" ? value : ""}
            onValueChange={(v) => onChange?.(v)}
            disabled={disabled}
          >
            <SelectTrigger id={id}>
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "multi_select": {
        const arr = Array.isArray(value) ? (value as string[]) : [];
        const toggle = (o: string) => {
          const next = arr.includes(o)
            ? arr.filter((x) => x !== o)
            : [...arr, o];
          onChange?.(next);
        };
        return (
          <div className="flex flex-wrap gap-2">
            {(field.options ?? []).map((o) => {
              const active = arr.includes(o);
              return (
                <button
                  key={o}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(o)}
                  className={
                    "px-3 py-1.5 rounded-full text-sm border transition " +
                    (active
                      ? "bg-accent-teal text-white border-accent-teal"
                      : "bg-white text-text-on-light border-border hover:border-accent-teal")
                  }
                >
                  {o}
                </button>
              );
            })}
          </div>
        );
      }
      case "boolean":
        return (
          <div className="flex items-center gap-3">
            <Switch
              id={id}
              checked={!!value}
              disabled={disabled}
              onCheckedChange={(v) => onChange?.(v)}
            />
            <span className="text-sm text-text-muted-light">
              {value ? "Yes" : "No"}
            </span>
          </div>
        );
      case "text":
        return (
          <Textarea
            id={id}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={disabled}
            placeholder="Add notes…"
            rows={3}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-sm font-medium text-text-on-light">
          {field.label}
          {field.required && <span className="text-accent-red ml-0.5">*</span>}
        </Label>
        {field.visibleToStudent === false && (
          <span className="text-[10px] uppercase tracking-wider text-text-muted-light">
            Internal
          </span>
        )}
      </div>
      {field.description && (
        <p className="text-xs text-text-muted-light">{field.description}</p>
      )}
      {inner()}
    </div>
  );
}

// keep unused import out
void Input;
