import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";
import { PageHeader } from "@/components/brand/PageHeader";
import { CornerPillBadge } from "@/components/brand/CornerPillBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth-store";
import { Key, Shield, User as UserIcon, Mail, Info } from "lucide-react";

export const Route = createFileRoute("/_app/profile")({
  ssr: false,
  component: ProfilePage,
});

function ProfilePage() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  // Instructor profile inputs
  const [organization, setOrganization] = useState("");
  const [designation, setDesignation] = useState("");
  const [bio, setBio] = useState("");
  const [specializations, setSpecializations] = useState("");

  // Student profile inputs
  const [rollNumber, setRollNumber] = useState("");
  const [batch, setBatch] = useState("");
  const [program, setProgram] = useState("");
  const [institution, setInstitution] = useState("");
  const [phone, setPhone] = useState("");

  // Password reset states
  const [sendingReset, setSendingReset] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    apiGet<{ user: User; profile: any }>("/users/me")
      .then(({ data }) => {
        setUser(data.user);
        setName(data.user.name);
        if (data.profile) {
          setProfile(data.profile);
          if (data.user.role === "instructor") {
            setOrganization(data.profile.organization || "");
            setDesignation(data.profile.designation || "");
            setBio(data.profile.bio || "");
            setSpecializations(
              data.profile.specializations
                ? data.profile.specializations.join(", ")
                : ""
            );
          } else if (data.user.role === "student") {
            setRollNumber(data.profile.rollNumber || "");
            setBatch(data.profile.batch || "");
            setProgram(data.profile.program || "");
            setInstitution(data.profile.institution || "");
            setPhone(data.profile.phone || "");
          }
        }
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      // 1. Update basic user details
      const userUpdate = await apiPatch<{ user: User }>("/users/me", { name });
      const updatedUser = userUpdate.user;
      setUser(updatedUser);

      // 2. Update role-specific profile details
      let profileBody = {};
      if (updatedUser.role === "instructor") {
        profileBody = {
          organization,
          designation,
          bio,
          specializations: specializations
            ? specializations.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
        };
      } else if (updatedUser.role === "student") {
        profileBody = {
          rollNumber,
          batch,
          program,
          institution,
          phone,
        };
      }

      const profileUpdate = await apiPatch<{ profile: any }>("/users/me/profile", profileBody);
      setProfile(profileUpdate.profile);

      // Invalidate store auth
      if (accessToken && refreshToken) {
        setAuth({ user: updatedUser, accessToken, refreshToken });
      }
      toast.success("Profile details updated successfully!");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const sendResetLink = async () => {
    if (!user) return;
    setSendingReset(true);
    try {
      await apiPost("/auth/forgot-password", { email: user.email });
      toast.success("A password verification code/link has been sent to your email!");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to send reset link");
    } finally {
      setSendingReset(false);
    }
  };

  const handleResetPasswordDirectly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken || !newPassword) {
      toast.error("Please enter both the token and the new password.");
      return;
    }
    setResettingPassword(true);
    try {
      await apiPatch(`/auth/reset-password/${resetToken}`, { password: newPassword });
      toast.success("Password changed successfully! Please log in again.");
      
      // Clear auth tokens and redirect
      useAuthStore.getState().clear();
      window.location.href = "/auth/login";
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Password reset failed");
    } finally {
      setResettingPassword(false);
    }
  };

  if (!user) return <div className="text-text-muted-light">Loading…</div>;

  const isGoogleUser = user.avatar && (user.avatar.includes("googleusercontent.com") || user.avatar.includes("lh3.googleusercontent.com"));

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title="Profile"
        subtitle="Manage your personal details and account security"
        pill={<CornerPillBadge tone="teal">{user.role}</CornerPillBadge>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns - Info Editor */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white border rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-display font-semibold text-text-on-light flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-accent-teal" /> Account Details
            </h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="flex gap-2 items-center mt-1">
                  <Input id="email" value={user.email} disabled className="bg-slate-50 flex-1" />
                  {isGoogleUser && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      Google OAuth
                    </span>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Full Name"
                  className="bg-white mt-1"
                />
              </div>

              {/* Student Role Fields */}
              {user.role === "student" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-hairline-light pt-4 mt-4">
                  <div className="sm:col-span-2">
                    <h3 className="font-display text-sm font-bold text-accent-teal uppercase tracking-wider mb-2">Student Information</h3>
                  </div>
                  <div>
                    <Label htmlFor="rollNumber">Roll Number</Label>
                    <Input
                      id="rollNumber"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      placeholder="e.g. 21BCE0123"
                      className="bg-white mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="batch">Batch / Year</Label>
                    <Input
                      id="batch"
                      value={batch}
                      onChange={(e) => setBatch(e.target.value)}
                      placeholder="e.g. 2021-2025"
                      className="bg-white mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="program">Program / Degree</Label>
                    <Input
                      id="program"
                      value={program}
                      onChange={(e) => setProgram(e.target.value)}
                      placeholder="e.g. B.Tech Computer Science"
                      className="bg-white mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="institution">Institution / College</Label>
                    <Input
                      id="institution"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      placeholder="e.g. VIT University"
                      className="bg-white mt-1"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +91 9876543210"
                      className="bg-white mt-1"
                    />
                  </div>
                </div>
              )}

              {/* Instructor Role Fields */}
              {user.role === "instructor" && (
                <div className="grid grid-cols-1 gap-4 border-t border-hairline-light pt-4 mt-4">
                  <div>
                    <h3 className="font-display text-sm font-bold text-accent-teal uppercase tracking-wider mb-2">Instructor Profile</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="organization">Organization / University</Label>
                      <Input
                        id="organization"
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        placeholder="e.g. PrepLyt Academy"
                        className="bg-white mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="designation">Designation</Label>
                      <Input
                        id="designation"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        placeholder="e.g. Senior GD Trainer"
                        className="bg-white mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="specializations">Specializations (comma separated)</Label>
                    <Input
                      id="specializations"
                      value={specializations}
                      onChange={(e) => setSpecializations(e.target.value)}
                      placeholder="e.g. MBA GDs, HR Interviews, Technical Debates"
                      className="bg-white mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bio">Professional Bio</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell students about your training experience..."
                      className="bg-white mt-1 min-h-[100px]"
                    />
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={save}
              disabled={saving}
              className="bg-accent-teal hover:bg-accent-teal-bright text-white mt-6 w-full sm:w-auto"
            >
              {saving ? "Saving Changes…" : "Save Details"}
            </Button>
          </section>
        </div>

        {/* Right Column - Security & Password management */}
        <div className="space-y-6">
          <section className="bg-white border rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-display font-semibold text-text-on-light flex items-center gap-2">
              <Shield className="h-4 w-4 text-accent-teal" /> Security & Passwords
            </h2>

            {isGoogleUser && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-3.5 text-xs space-y-1 leading-relaxed">
                <div className="font-semibold flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 shrink-0" /> Google Linked Account
                </div>
                <p className="text-blue-700">
                  You logged in via Google. Social logins do not use local passwords. If you wish to set a password to log in via credentials later, trigger a verification email below.
                </p>
              </div>
            )}

            <div className="space-y-3.5">
              <div className="text-sm">
                <span className="text-xs text-text-muted-light block font-semibold uppercase tracking-wider">Email Reset Flow</span>
                <p className="text-xs text-text-muted-light mt-1">
                  Request a secure password verification code/link to be delivered to your registered email inbox.
                </p>
                <Button
                  onClick={sendResetLink}
                  disabled={sendingReset}
                  className="w-full mt-3 bg-slate-900 hover:bg-slate-800 text-white text-xs h-9 flex items-center justify-center gap-2"
                >
                  <Mail className="h-3.5 w-3.5" /> {sendingReset ? "Sending code..." : "Email Reset Verification"}
                </Button>
              </div>

              <div className="border-t border-hairline-light pt-4 mt-4 text-left">
                <span className="text-xs text-text-muted-light block font-semibold uppercase tracking-wider mb-2">Reset Password with Code</span>
                
                <form onSubmit={handleResetPasswordDirectly} className="space-y-3">
                  <div>
                    <Label htmlFor="resetToken" className="text-xs">Verification Code / Token</Label>
                    <Input
                      id="resetToken"
                      placeholder="Paste token from email link..."
                      required
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      className="bg-white text-xs h-8 mt-1 font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newPassword" className="text-xs">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Minimum 6 characters"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-white text-xs h-8 mt-1"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={resettingPassword}
                    className="w-full bg-accent-teal hover:bg-accent-teal-bright text-white text-xs h-9"
                  >
                    {resettingPassword ? "Updating Password..." : "Update Password"}
                  </Button>
                </form>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
