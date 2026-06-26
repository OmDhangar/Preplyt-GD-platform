import { cn } from "@/lib/utils";
import { Check, Loader2, WifiOff, RotateCw } from "lucide-react";

export type SaveStatus = "idle" | "saving" | "saved" | "offline" | "retrying";

const config: Record<
  SaveStatus,
  { label: string; tone: string; Icon: typeof Check }
> = {
  idle: {
    label: "All saved",
    tone: "bg-surface-muted text-text-muted-light ring-hairline-light",
    Icon: Check,
  },
  saving: {
    label: "Saving…",
    tone: "bg-accent-amber/10 text-accent-amber ring-accent-amber/20",
    Icon: Loader2,
  },
  saved: {
    label: "Saved",
    tone: "bg-accent-teal/10 text-accent-teal ring-accent-teal/20",
    Icon: Check,
  },
  offline: {
    label: "Offline",
    tone: "bg-accent-red/10 text-accent-red ring-accent-red/20",
    Icon: WifiOff,
  },
  retrying: {
    label: "Retrying…",
    tone: "bg-accent-amber/10 text-accent-amber ring-accent-amber/20",
    Icon: RotateCw,
  },
};

export function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  const { label, tone, Icon } = config[status];
  const spinning = status === "saving" || status === "retrying";
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 transition-colors",
        tone,
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", spinning && "animate-spin")} />
      <span>{label}</span>
    </div>
  );
}
