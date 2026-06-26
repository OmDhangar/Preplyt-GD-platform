import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  pill?: ReactNode;
  actions?: ReactNode;
  variant?: "light" | "dark";
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  pill,
  actions,
  variant = "light",
  className,
}: Props) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6", className)}>
      <div>
        <div className="flex items-center gap-3">
          <h1
            className={cn(
              "font-display font-bold text-3xl md:text-4xl",
              variant === "light" ? "text-text-on-light" : "text-text-on-dark",
            )}
          >
            {title}
          </h1>
          {pill}
        </div>
        {subtitle && (
          <p className="italic text-accent-teal mt-1 text-base">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
