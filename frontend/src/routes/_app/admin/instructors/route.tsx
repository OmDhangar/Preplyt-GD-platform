import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch, apiDelete, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";
import { PageHeader } from "@/components/brand/PageHeader";
import { CornerPillBadge } from "@/components/brand/CornerPillBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Check, X } from "lucide-react";

export const Route = createFileRoute("/_app/admin/instructors")({
  ssr: false,
  component: AdminInstructorsPage,
});

interface PendingInstructor {
  user: User;
  profile: {
    organization?: string;
    designation?: string;
    bio?: string;
    specializations?: string[];
  } | null;
}

function AdminInstructorsPage() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"pending" | "all" | "students">("pending");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submittingReject, setSubmittingReject] = useState(false);

  // Queries
  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ["instructors", "pending"],
    queryFn: async () => (await apiGet<{ instructors: PendingInstructor[] }>("/users/instructors/pending")).data,
    enabled: role === "admin",
  });

  const { data: allData, isLoading: allLoading } = useQuery({
    queryKey: ["instructors", "all"],
    queryFn: async () => (await apiGet<{ users: User[] }>("/users?role=instructor&limit=1000")).data,
    enabled: role === "admin",
  });

  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ["users", "students"],
    queryFn: async () => (await apiGet<{ users: User[] }>("/users?role=student&limit=1000")).data,
    enabled: role === "admin",
  });

  if (role !== "admin") {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white border rounded-2xl p-6 text-center space-y-4 shadow-elegant text-left">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xl font-bold">
          🚫
        </div>
        <h2 className="text-xl font-bold text-text-on-light">Access Denied</h2>
        <p className="text-sm text-text-muted-light">
          You do not have the necessary permissions to access this page. Please contact your system administrator.
        </p>
      </div>
    );
  }

  const approve = async (id: string) => {
    if (!confirm("Are you sure you want to verify and approve this instructor?")) return;
    try {
      await apiPatch(`/users/${id}/verify`);
      toast.success("Instructor verified successfully!");
      qc.invalidateQueries({ queryKey: ["instructors"] });
      qc.invalidateQueries({ queryKey: ["users"] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to verify instructor");
    }
  };

  const openRejectModal = (id: string) => {
    setRejectingUserId(id);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingUserId) return;
    setSubmittingReject(true);
    try {
      await apiPatch(`/users/${rejectingUserId}/reject`, { reason: rejectionReason });
      toast.success("Instructor account rejected");
      setShowRejectModal(false);
      setRejectingUserId(null);
      setRejectionReason("");
      qc.invalidateQueries({ queryKey: ["instructors"] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to reject instructor");
    } finally {
      setSubmittingReject(false);
    }
  };

  const toggleBlacklist = async (id: string, isCurrentlyBlacklisted: boolean) => {
    const actionWord = isCurrentlyBlacklisted ? "whitelist" : "blacklist";
    if (!confirm(`Are you sure you want to ${actionWord} this user?`)) return;
    try {
      await apiPatch(`/users/${id}/blacklist`);
      toast.success(`User ${isCurrentlyBlacklisted ? "unblacklisted" : "blacklisted"} successfully!`);
      qc.invalidateQueries({ queryKey: ["instructors"] });
      qc.invalidateQueries({ queryKey: ["users"] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to toggle blacklist status");
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this user? This will delete their account and profile. This action CANNOT be undone!")) return;
    try {
      await apiDelete(`/users/${id}`);
      toast.success("User deleted successfully!");
      qc.invalidateQueries({ queryKey: ["instructors"] });
      qc.invalidateQueries({ queryKey: ["users"] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to delete user");
    }
  };

  const getStatusBadgeTone = (status?: string) => {
    switch (status) {
      case "approved":
        return "teal";
      case "rejected":
        return "red";
      default:
        return "amber";
    }
  };

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title="User & Instructor Management"
        subtitle="Review registrations, manage statuses, blacklist, or delete users"
      />

      {/* Tabs */}
      <div className="flex border-b gap-6 text-sm font-semibold mb-6">
        <button
          onClick={() => setActiveTab("pending")}
          className={
            "pb-3 capitalize transition-all border-b-2 " +
            (activeTab === "pending"
              ? "border-accent-teal text-accent-teal"
              : "border-transparent text-text-muted-light hover:text-text-on-light")
          }
        >
          Pending Verification ({pendingData?.instructors?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("all")}
          className={
            "pb-3 capitalize transition-all border-b-2 " +
            (activeTab === "all"
              ? "border-accent-teal text-accent-teal"
              : "border-transparent text-text-muted-light hover:text-text-on-light")
          }
        >
          All Instructors ({allData?.users?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("students")}
          className={
            "pb-3 capitalize transition-all border-b-2 " +
            (activeTab === "students"
              ? "border-accent-teal text-accent-teal"
              : "border-transparent text-text-muted-light hover:text-text-on-light")
          }
        >
          All Students ({studentsData?.users?.length || 0})
        </button>
      </div>

      {activeTab === "pending" ? (
        pendingLoading ? (
          <div className="text-text-muted-light">Loading pending list...</div>
        ) : pendingData?.instructors?.length ? (
          <div className="grid grid-cols-1 gap-4">
            {pendingData.instructors.map(({ user, profile }) => (
              <div key={user._id} className="bg-white border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-display font-semibold text-lg">{user.name}</h3>
                    <CornerPillBadge tone="amber">Pending Approval</CornerPillBadge>
                  </div>
                  <div className="text-sm text-text-muted-light grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                    <div>📧 {user.email}</div>
                    {profile?.organization && <div>🏢 {profile.organization}</div>}
                    {profile?.designation && <div>👔 {profile.designation}</div>}
                    {profile?.specializations?.length && (
                      <div className="col-span-2">
                        🏷️ Specializations: {profile.specializations.join(", ")}
                      </div>
                    )}
                  </div>
                  {profile?.bio && (
                    <div className="bg-surface-light border rounded-xl p-3.5 text-xs text-text-muted-light">
                      <div className="font-semibold text-text-on-light mb-1">Bio/Background:</div>
                      {profile.bio}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 shrink-0 self-start md:self-center">
                  <Button
                    onClick={() => approve(user._id)}
                    className="bg-accent-teal hover:bg-accent-teal-bright text-white text-sm"
                  >
                    <Check className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => openRejectModal(user._id)}
                    className="text-accent-red hover:bg-red-50 hover:text-accent-red border-red-200"
                  >
                    <X className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white border border-dashed rounded-2xl text-text-muted-light">
            No pending instructor registrations found.
          </div>
        )
      ) : activeTab === "all" ? (
        allLoading ? (
          <div className="text-text-muted-light">Loading instructor directory...</div>
        ) : allData?.users?.length ? (
          <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-surface-light text-left text-xs uppercase tracking-wider text-text-muted-light border-b font-semibold">
                  <tr>
                    <th className="p-4">Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Status & Verification</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {allData.users.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-semibold text-text-on-light">{u.name}</td>
                      <td className="p-4 text-text-muted-light">{u.email}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <CornerPillBadge tone={getStatusBadgeTone(u.verificationStatus)}>
                            {u.verificationStatus || (u.isVerified ? "approved" : "pending")}
                          </CornerPillBadge>
                          {u.isBlacklisted && (
                            <CornerPillBadge tone="red">
                              Blacklisted
                            </CornerPillBadge>
                          )}
                          {u.verificationStatus === "rejected" && u.rejectionReason && (
                            <span className="text-xs text-accent-red block w-full mt-1 max-w-[250px] truncate" title={u.rejectionReason}>
                              Reason: {u.rejectionReason}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {u.verificationStatus !== "approved" && (
                            <Button
                              size="sm"
                              onClick={() => approve(u._id)}
                              className="bg-accent-teal hover:bg-accent-teal-bright text-white text-xs py-1 h-7"
                            >
                              Approve
                            </Button>
                          )}
                          {u.verificationStatus === "approved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openRejectModal(u._id)}
                              className="text-accent-red hover:bg-red-50 hover:text-accent-red border-red-200 text-xs py-1 h-7"
                            >
                              Reject
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleBlacklist(u._id, !!u.isBlacklisted)}
                            className={
                              u.isBlacklisted
                                ? "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-600 border-emerald-200 text-xs py-1 h-7"
                                : "text-amber-600 hover:bg-amber-50 hover:text-amber-600 border-amber-200 text-xs py-1 h-7"
                            }
                          >
                            {u.isBlacklisted ? "Whitelist" : "Blacklist"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteUser(u._id)}
                            className="text-accent-red hover:bg-red-50 hover:text-accent-red border-red-200 text-xs py-1 h-7"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-white border border-dashed rounded-2xl text-text-muted-light">
            No instructors found.
          </div>
        )
      ) : studentsLoading ? (
        <div className="text-text-muted-light">Loading student directory...</div>
      ) : studentsData?.users?.length ? (
        <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-surface-light text-left text-xs uppercase tracking-wider text-text-muted-light border-b font-semibold">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {studentsData.users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-semibold text-text-on-light">{u.name}</td>
                    <td className="p-4 text-text-muted-light">{u.email}</td>
                    <td className="p-4">
                      {u.isBlacklisted ? (
                        <CornerPillBadge tone="red">Blacklisted</CornerPillBadge>
                      ) : (
                        <CornerPillBadge tone="teal">Active</CornerPillBadge>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleBlacklist(u._id, !!u.isBlacklisted)}
                          className={
                            u.isBlacklisted
                              ? "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-600 border-emerald-200 text-xs py-1 h-7"
                              : "text-amber-600 hover:bg-amber-50 hover:text-amber-600 border-amber-200 text-xs py-1 h-7"
                          }
                        >
                          {u.isBlacklisted ? "Whitelist" : "Blacklist"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteUser(u._id)}
                          className="text-accent-red hover:bg-red-50 hover:text-accent-red border-red-200 text-xs py-1 h-7"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white border border-dashed rounded-2xl text-text-muted-light">
          No students found.
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-hairline-light rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-red-500" />
            <div className="space-y-2">
              <h3 className="font-display text-xl font-bold text-text-on-light">
                Reject Instructor Verification
              </h3>
              <p className="text-sm text-text-muted-light">
                Please specify a reason for rejecting this instructor account. The instructor will receive an email notice with this reason.
              </p>
            </div>

            <form onSubmit={handleReject} className="space-y-4">
              <div>
                <Label htmlFor="rejectReason">Rejection Reason (Optional)</Label>
                <Input
                  id="rejectReason"
                  placeholder="e.g. Please provide a copy of your teaching credential or university affiliation."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="bg-white mt-1"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={submittingReject}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {submittingReject ? "Rejecting..." : "Confirm Rejection"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectingUserId(null);
                    setRejectionReason("");
                  }}
                  disabled={submittingReject}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
