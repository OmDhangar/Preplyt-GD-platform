import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiPost, ApiError } from "@/lib/api";
import { AuthShell } from "@/routes/auth/login/route";

export const Route = createFileRoute("/auth/forgot-password")({
  ssr: false,
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiPost("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Reset password" subtitle="we'll email you a link">
      {sent ? (
        <div className="text-center space-y-3">
          <p className="text-text-muted-dark text-sm">
            If an account exists for <span className="text-white">{email}</span>,
            you'll receive a reset link shortly.
          </p>
          <Link to="/auth/login" className="text-accent-teal text-sm hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-white/80">Email</Label>
            <Input id="email" type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-bg-dark border-white/10 text-white" />
          </div>
          <Button type="submit" disabled={loading}
            className="w-full bg-accent-teal hover:bg-accent-teal-bright">
            {loading ? "Sending…" : "Send reset link"}
          </Button>
          <div className="text-center">
            <Link to="/auth/login" className="text-xs text-text-muted-dark hover:text-accent-teal">
              Back to sign in
            </Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
