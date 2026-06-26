import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { apiGet, ApiError } from "@/lib/api";
import { AuthShell } from "./auth.login";

export const Route = createFileRoute("/auth/verify/$token")({
  ssr: false,
  component: VerifyPage,
});

function VerifyPage() {
  const { token } = Route.useParams();
  const [status, setStatus] = useState<"loading" | "ok" | "err">("loading");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    apiGet(`/auth/verify/${token}`)
      .then(() => setStatus("ok"))
      .catch((err) => {
        setStatus("err");
        setMsg(err instanceof ApiError ? err.message : "Verification failed");
      });
  }, [token]);

  return (
    <AuthShell title="Email verification" subtitle="confirming your account">
      <div className="text-center space-y-3">
        {status === "loading" && (
          <p className="text-text-muted-dark text-sm">Verifying…</p>
        )}
        {status === "ok" && (
          <>
            <p className="text-accent-teal-bright text-sm">
              Your email has been verified.
            </p>
            <Link to="/auth/login" className="text-accent-teal hover:underline text-sm">
              Continue to sign in →
            </Link>
          </>
        )}
        {status === "err" && (
          <>
            <p className="text-accent-red text-sm">{msg}</p>
            <Link to="/auth/login" className="text-accent-teal hover:underline text-sm">
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </AuthShell>
  );
}
