import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function CornerPillBadge({
  children,
  className,
  tone = "dark",
}: {
  children: ReactNode;
  className?: string;
  tone?: "dark" | "teal" | "amber" | "red";
}) {
  const tones = {
    dark: "bg-surface-dark/8 text-text-on-light ring-1 ring-hairline-light",
    teal: "bg-accent-teal/10 text-accent-teal ring-1 ring-accent-teal/20",
    amber: "bg-accent-amber/10 text-accent-amber ring-1 ring-accent-amber/20",
    red: "bg-accent-red/10 text-accent-red ring-1 ring-accent-red/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
