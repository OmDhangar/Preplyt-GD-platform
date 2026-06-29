import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { apiPost } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/auth/google/callback")({
  validateSearch: (search: Record<string, unknown>): { code?: string } => ({
    code: typeof search.code === "string" ? search.code : undefined,
  }),
  component: GoogleCallback,
});

function GoogleCallback() {
  const { code } = Route.useSearch();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const handleExchange = async () => {
      if (!code) {
        setStatus("error");
        setErrorMsg("Authorization code is missing from the Google callback URL.");
        return;
      }

      try {
        await apiPost("/auth/google/callback", {
          code,
          redirectUri: window.location.origin + "/auth/google/callback",
        });
        
        setStatus("success");
        toast.success("Google Calendar connected successfully!");
        
        // Notify parent window & close
        if (window.opener) {
          window.opener.postMessage("google-connected", window.location.origin);
        }
        
        setTimeout(() => {
          window.close();
        }, 1500);
      } catch (err: any) {
        console.error(err);
        setStatus("error");
        setErrorMsg(err.message || "Failed to exchange Google OAuth code.");
        toast.error("Failed to connect Google Calendar.");
      }
    };

    handleExchange();
  }, [code]);

  return (
    <div className="min-h-screen bg-bg-dark text-text-on-dark flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="max-w-md w-full bg-surface-dark/60 backdrop-blur-md border border-hairline-dark rounded-2xl p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
        {status === "loading" && (
          <div className="space-y-4">
            <Loader2 className="h-12 w-12 text-accent-teal animate-spin mx-auto" />
            <h2 className="font-display text-xl font-bold">Connecting Google Calendar</h2>
            <p className="text-sm text-text-muted-dark leading-relaxed">
              Exchanging security tokens with Google API. Please do not close this window...
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <CheckCircle2 className="h-12 w-12 text-accent-teal animate-bounce mx-auto" />
            <h2 className="font-display text-xl font-bold text-accent-teal-glow">Connected!</h2>
            <p className="text-sm text-text-muted-dark leading-relaxed">
              Your Google Calendar account is now connected to PrepLyt. This window will close automatically.
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <AlertTriangle className="h-12 w-12 text-accent-red mx-auto" />
            <h2 className="font-display text-xl font-bold text-accent-red">Connection Failed</h2>
            <p className="text-sm text-text-muted-dark leading-relaxed">
              {errorMsg}
            </p>
            <button
              onClick={() => window.close()}
              className="px-4 py-2 bg-surface-dark-2 hover:bg-slate-800 text-white rounded-lg text-sm border font-medium transition-colors cursor-pointer"
            >
              Close Window
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
