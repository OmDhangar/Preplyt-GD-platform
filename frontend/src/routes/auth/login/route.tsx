import { createFileRoute, Link, useNavigate, useSearch, useHydrated } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/login")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login, loginGoogle, logout } = useAuth();
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth/login" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "instructor">("student");
  const [loading, setLoading] = useState(false);
  const [showGoogleMock, setShowGoogleMock] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const roleRef = useRef(role);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const loadAndInitGoogle = async () => {
      try {
        if (!(window as any).google) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://accounts.google.com/gsi/client";
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load Google SDK script"));
            document.body.appendChild(script);
          });
        }

        if (!(window as any).googleInitialized) {
          (window as any).google.accounts.id.initialize({
            client_id: clientId,
            callback: (response: any) => {
              if (typeof (window as any).onGoogleCredential === "function") {
                (window as any).onGoogleCredential(response);
              }
            },
          });
          (window as any).googleInitialized = true;
        }
      } catch (err) {
        console.error("Failed to initialize Google Sign-In SDK:", err);
      }
    };

    loadAndInitGoogle();
  }, []);

  useEffect(() => {
    (window as any).onGoogleCredential = async (response: any) => {
      setLoading(true);
      try {
        const user = await loginGoogle(response.credential, roleRef.current);
        const isAllowed = user.role === roleRef.current || (roleRef.current === "instructor" && user.role === "admin");
        if (!isAllowed) {
          await logout();
          toast.error(`This Google account is registered as a ${user.role}. Please switch roles or use the correct login.`);
        } else {
          toast.success("Google Login successful");
          navigate({ to: redirect || "/dashboard" });
        }
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Google Login failed");
      } finally {
        setLoading(false);
      }
    };

    return () => {
      delete (window as any).onGoogleCredential;
    };
  }, [loginGoogle, logout, navigate, redirect]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      const isAllowed = user.role === role || (role === "instructor" && user.role === "admin");
      if (!isAllowed) {
        await logout();
        toast.error(`This account is registered as a ${user.role}. Please use the ${user.role === "student" ? "Student" : "Instructor"} login.`);
      } else {
        toast.success("Login successful");
        navigate({ to: redirect || "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Login failed");
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
    
    setLoading(true);
    try {
      if (!(window as any).google) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://accounts.google.com/gsi/client";
          script.async = true;
          script.defer = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Google SDK script"));
          document.body.appendChild(script);
        });
      }

      if (!(window as any).googleInitialized) {
        (window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: any) => {
            if (typeof (window as any).onGoogleCredential === "function") {
              (window as any).onGoogleCredential(response);
            }
          },
        });
        (window as any).googleInitialized = true;
      }

      (window as any).google.accounts.id.prompt();
    } catch (err) {
      toast.error("Failed to load Google Sign-In SDK.");
    } finally {
      setLoading(false);
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
        toast.error(`This Google account is registered as a ${user.role}. Please switch roles or use the correct login.`);
      } else {
        toast.success("Google Login successful");
        navigate({ to: redirect || "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Google Login failed");
    } finally {
      setLoading(false);
    }
  };

  const mockEmails = role === "student"
    ? ["aryan.sharma@gdeval.dev", "priya.patel@gdeval.dev", "rohit.verma@gdeval.dev"]
    : ["instructor@gdeval.dev", "instructor2@gdeval.dev"];

  return (
    <AuthShell title="Welcome to PrepLyt" subtitle="sign in to your workspace">
      <div className="flex gap-2 p-1 bg-bg-dark/70 rounded-lg mb-6 border border-white/5">
        {(["student", "instructor"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={
              "flex-1 py-2 rounded-md text-sm font-medium capitalize transition-all duration-200 " +
              (role === r
                ? "bg-accent-teal text-white shadow-glow-teal"
                : "text-text-muted-dark hover:text-white")
            }
          >
            {r} Portal
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-white/80">Email</Label>
          <Input id="email" type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={`Enter your ${role} email`}
            className="bg-bg-dark border-white/10 text-white placeholder:text-white/30" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-white/80">Password</Label>
          <div className="relative">
            <Input id="password" type={showPassword ? "text" : "password"} required value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-bg-dark border-white/10 text-white pr-10" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors duration-200 cursor-pointer"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" disabled={loading}
          className="w-full bg-accent-teal hover:bg-accent-teal-bright text-white shadow-glow-teal font-medium py-5">
          {loading ? "Signing in…" : `Sign in as ${role === "student" ? "Student" : "Instructor"}`}
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
        disabled={loading}
        variant="outline"
        className="w-full border-transparent bg-white hover:bg-neutral-100 text-[#050811] flex items-center justify-center gap-2.5 py-5 cursor-pointer transition-colors duration-200"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-[#050811]" />
            Connecting to Google...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign in with Google
          </>
        )}
      </Button>

      <div className="flex justify-between text-xs text-text-muted-dark pt-6 mt-2 border-t border-white/5">
        <Link to="/auth/forgot-password" className="hover:text-accent-teal transition">
          Forgot password?
        </Link>
        <Link to="/auth/register" className="hover:text-accent-teal transition">
          Create account
        </Link>
      </div>

      {showGoogleMock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-bg-dark border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-fade-in text-white">
            <div>
              <h3 className="font-display font-semibold text-lg text-gradient-teal flex items-center gap-2">
                Google Account Chooser
              </h3>
              <p className="text-xs text-text-muted-dark mt-1">
                Select a mock Google account to test the login locally.
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
                  Confirm Sign In
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AuthShell>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const isHydrated = useHydrated();

  if (!isHydrated) {
    return null;
  }

  return (
    <div className="min-h-screen auth-ambient text-text-on-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-teal items-center justify-center font-display text-lg font-bold mb-4 shadow-glow-teal">
            GD
          </div>
          <h1 className="font-display text-4xl font-semibold text-gradient-teal">
            {title}
          </h1>
          {subtitle && (
            <p className="italic text-text-muted-dark mt-2 tracking-wide">
              {subtitle}
            </p>
          )}
        </div>
        <div className="bg-surface-dark/50 backdrop-blur-xl rounded-2xl p-7 border border-white/5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
          {children}
        </div>
      </div>
    </div>
  );
}
