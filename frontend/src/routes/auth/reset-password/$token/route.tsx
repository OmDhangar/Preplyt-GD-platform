import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiPatch, ApiError } from "@/lib/api";
import { AuthShell } from "@/routes/auth/login/route";

export const Route = createFileRoute("/auth/reset-password/$token")({
  ssr: false,
  component: ResetPage,
});

function ResetPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiPatch(`/auth/reset-password/${token}`, { password });
      toast.success("Password updated. Sign in to continue.");
      navigate({ to: "/auth/login" });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Set new password" subtitle="choose something memorable">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-white/80">New password</Label>
          <Input id="password" type="password" required minLength={6} value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-bg-dark border-white/10 text-white" />
        </div>
        <Button type="submit" disabled={loading}
          className="w-full bg-accent-teal hover:bg-accent-teal-bright">
          {loading ? "Updating…" : "Update password"}
        </Button>
        <div className="text-center">
          <Link to="/auth/login" className="text-xs text-text-muted-dark hover:text-accent-teal">
            Back to sign in
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
