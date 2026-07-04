import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
  pill?: ReactNode;
  actions?: ReactNode;
  variant?: "light" | "dark";
  className?: string;
  backUrl?: string;
  showBack?: boolean;
  backBehavior?: "logical" | "history";
}

export function PageHeader({
  title,
  subtitle,
  pill,
  actions,
  variant = "light",
  className,
  backUrl,
  showBack,
  backBehavior = "logical",
}: Props) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backBehavior === "history" && window.history.length > 1) {
      window.history.back();
    } else if (backUrl) {
      navigate({ to: backUrl });
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate({ to: "/" });
    }
  };

  return (
    <div className={cn("flex flex-col gap-2 mb-6", className)}>
      {(backUrl || showBack) && (
        <div className="flex items-center">
          <button
            onClick={handleBack}
            className={cn(
              "inline-flex items-center gap-1 text-xs font-semibold hover:underline transition duration-200 cursor-pointer bg-transparent border-0 p-0",
              variant === "light" ? "text-text-muted-light hover:text-text-on-light" : "text-text-muted-dark hover:text-text-on-dark"
            )}
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back
          </button>
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1
              className={cn(
                "font-display font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl break-words",
                variant === "light" ? "text-text-on-light" : "text-text-on-dark",
              )}
            >
              {title}
            </h1>
            {pill}
          </div>
          {subtitle && (
            <p className="italic text-accent-teal mt-1 text-xs sm:text-sm md:text-base leading-relaxed line-clamp-2 md:line-clamp-none">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
