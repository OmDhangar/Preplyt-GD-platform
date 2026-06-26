import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  step?: number;
  className?: string;
  tone?: "teal" | "amber" | "red" | "dark";
}

const sizes = {
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-14 w-14 text-lg",
};

const tones = {
  teal: "bg-gradient-teal text-white shadow-glow-teal ring-1 ring-white/10",
  amber:
    "bg-[linear-gradient(135deg,#fbbf24,#f59e0b)] text-white ring-1 ring-white/10",
  red: "bg-[linear-gradient(135deg,#f87171,#ef4444)] text-white ring-1 ring-white/10",
  dark: "bg-surface-dark text-text-on-dark ring-1 ring-white/5",
};

export function IconCircle({
  children,
  size = "md",
  step,
  className,
  tone = "teal",
}: Props) {
  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      <div
        className={cn(
          "rounded-full flex items-center justify-center",
          sizes[size],
          tones[tone],
        )}
      >
        {children}
      </div>
      {step != null && (
        <span className="absolute -top-1 -left-1 h-5 w-5 rounded-full bg-bg-dark text-text-on-dark text-[10px] font-bold flex items-center justify-center ring-2 ring-surface-light">
          {step}
        </span>
      )}
    </div>
  );
}
