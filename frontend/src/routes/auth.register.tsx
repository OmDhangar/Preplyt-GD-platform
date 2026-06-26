import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { AuthShell } from "./auth.login";
import type { Role } from "@/lib/types";

export const Route = createFileRoute("/auth/register")({
  ssr: false,
  component: RegisterPage,
});

function RegisterPage() {
  const { register, loginGoogle, logout } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [loading, setLoading] = useState(false);
  const [showGoogleMock, setShowGoogleMock] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register({ name, email, password, role });
      toast.success("Account created");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (e: React.MouseEvent) => {
    e.preventDefault();
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setGoogleEmail(role === "student" ? "aryan.sharma@gdeval.dev" : "instructor@gdeval.dev");
      setShowGoogleMock(true);
      return;
    }
    
    try {
      if (!(window as any).google) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://accounts.google.com/gsi/client";
          script.async = true;
          script.defer = true;
          script.onload = () => resolve();
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      (window as any).google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: any) => {
          setLoading(true);
          try {
            const user = await loginGoogle(response.credential, role);
            const isAllowed = user.role === role || (role === "instructor" && user.role === "admin");
            if (!isAllowed) {
              await logout();
              toast.error(`This Google account is registered as a ${user.role}. Please register or switch roles.`);
            } else {
              toast.success("Account created & Google Sign In successful");
              navigate({ to: "/dashboard" });
            }
          } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Google registration failed");
          } finally {
            setLoading(false);
          }
        },
      });

      (window as any).google.accounts.id.prompt();
    } catch (err) {
      toast.error("Failed to load Google Sign-In SDK.");
    }
  };

  const submitGoogleMock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail) return;
    setLoading(true);
    setShowGoogleMock(false);
    try {
      const mockToken = `mock_google_token_${googleEmail}`;
      const user = await loginGoogle(mockToken, role);
      const isAllowed = user.role === role || (role === "instructor" && user.role === "admin");
      if (!isAllowed) {
        await logout();
        toast.error(`This Google account is registered as a ${user.role}. Please register or switch roles.`);
      } else {
        toast.success("Account created & Google Sign In successful");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Google registration failed");
    } finally {
      setLoading(false);
    }
  };

  const mockEmails = role === "student"
    ? ["aryan.sharma@gdeval.dev", "priya.patel@gdeval.dev", "rohit.verma@gdeval.dev"]
    : ["instructor@gdeval.dev", "instructor2@gdeval.dev"];

  return (
    <AuthShell title="Create account" subtitle="join the workspace">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex gap-2 p-1 bg-bg-dark rounded-lg">
          {(["student", "instructor"] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={
                "flex-1 py-2 rounded-md text-sm capitalize transition " +
                (role === r
                  ? "bg-accent-teal text-white shadow-glow-teal font-medium"
                  : "text-text-muted-dark hover:text-white")
              }
            >
              {r}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-white/80">Full name</Label>
          <Input id="name" required value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-bg-dark border-white/10 text-white" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-white/80">Email</Label>
          <Input id="email" type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-bg-dark border-white/10 text-white" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-white/80">Password</Label>
          <Input id="password" type="password" required minLength={6} value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-bg-dark border-white/10 text-white" />
        </div>
        <Button type="submit" disabled={loading}
          className="w-full bg-accent-teal hover:bg-accent-teal-bright text-white shadow-glow-teal font-medium py-5">
          {loading ? "Creating…" : "Create account"}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-surface-dark px-3 text-text-muted-dark">Or continue with</span>
        </div>
      </div>

      <Button
        onClick={handleGoogleLogin}
        variant="outline"
        className="w-full border-white/10 hover:border-white/20 text-white bg-bg-dark/40 hover:bg-bg-dark flex items-center justify-center gap-2.5 py-5 cursor-pointer"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Sign up with Google
      </Button>

      <div className="text-center text-xs text-text-muted-dark pt-6 mt-2 border-t border-white/5">
        Already have an account?{" "}
        <Link to="/auth/login" className="text-accent-teal hover:underline transition">
          Sign in
        </Link>
      </div>

      {showGoogleMock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-bg-dark border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-fade-in text-white text-left">
            <div>
              <h3 className="font-display font-semibold text-lg text-gradient-teal flex items-center gap-2">
                Google Account Chooser
              </h3>
              <p className="text-xs text-text-muted-dark mt-1">
                Select a mock Google account to test register and login locally.
              </p>
            </div>

            <div className="space-y-1.5">
              {mockEmails.map((emailAddr) => (
                <button
                  key={emailAddr}
                  onClick={() => setGoogleEmail(emailAddr)}
                  className={
                    "w-full text-left px-3 py-2 rounded-lg text-sm transition-all border " +
                    (googleEmail === emailAddr
                      ? "bg-accent-teal/10 border-accent-teal text-white font-medium"
                      : "bg-surface-dark border-white/5 hover:border-white/10 text-white/80")
                  }
                >
                  {emailAddr}
                </button>
              ))}
            </div>

            <form onSubmit={submitGoogleMock} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="google-custom-email" className="text-white/60 text-xs">Or use custom email:</Label>
                <Input
                  id="google-custom-email"
                  type="email"
                  required
                  placeholder="name@gmail.com"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  className="bg-surface-dark border-white/10 text-sm h-9 text-white"
                />
              </div>
              <div className="flex gap-2 justify-end text-sm">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowGoogleMock(false)}
                  className="text-white/60 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-accent-teal hover:bg-accent-teal-bright text-white"
                  disabled={!googleEmail}
                >
                  Confirm Registration
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
