import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  hint?: string;
  variant?: "light" | "dark";
  accent?: "teal" | "amber" | "red";
  icon?: ReactNode;
  className?: string;
}

const accents = {
  teal: "text-accent-teal",
  amber: "text-accent-amber",
  red: "text-accent-red",
};

export function StatCard({
  label,
  value,
  hint,
  variant = "light",
  accent = "teal",
  icon,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "group rounded-2xl p-5 flex items-start gap-4 border transition-all duration-300 hover:-translate-y-0.5",
        variant === "light"
          ? "bg-surface-light border-hairline-light shadow-elegant hover:shadow-glow-teal"
          : "bg-gradient-surface-dark border-hairline-dark text-text-on-dark",
        className,
      )}
    >
      {icon && <div className="shrink-0">{icon}</div>}
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "text-[11px] uppercase tracking-[0.14em] font-medium",
            variant === "light" ? "text-text-muted-light" : "text-text-muted-dark",
          )}
        >
          {label}
        </div>
        <div
          className={cn(
            "text-3xl font-display font-semibold mt-2 tabular-nums",
            accents[accent],
          )}
        >
          {value}
        </div>
        {hint && (
          <div
            className={cn(
              "text-xs mt-1.5",
              variant === "light"
                ? "text-text-muted-light"
                : "text-text-muted-dark",
            )}
          >
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}
