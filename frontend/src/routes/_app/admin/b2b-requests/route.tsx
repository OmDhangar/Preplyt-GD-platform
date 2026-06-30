import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/brand/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Building,
  User,
  GraduationCap,
  MapPin,
  Users,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  PhoneCall,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/_app/admin/b2b-requests")({
  ssr: false,
  component: AdminB2bRequestsPage,
});

interface B2bRequest {
  _id: string;
  name: string;
  designation: string;
  college: string;
  city: string;
  students: number;
  phone: string;
  email: string;
  status: "pending" | "reviewed" | "contacted";
  createdAt: string;
}

function AdminB2bRequestsPage() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Query B2B Requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ["b2b-requests", filterStatus],
    queryFn: async () => {
      const url = filterStatus ? `/b2b-requests?status=${filterStatus}` : "/b2b-requests";
      return (await apiGet<B2bRequest[]>(url)).data;
    },
    enabled: role === "admin",
  });

  if (role !== "admin") {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white border border-hairline-light rounded-2xl p-6 text-center space-y-4 shadow-elegant text-left">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xl font-bold">
          🚫
        </div>
        <h2 className="text-xl font-bold text-text-on-light font-display">Access Denied</h2>
        <p className="text-sm text-text-muted-light">
          You do not have the necessary permissions to access this page. Please contact your system administrator.
        </p>
      </div>
    );
  }

  const updateStatus = async (id: string, status: "pending" | "reviewed" | "contacted") => {
    setUpdatingId(id);
    try {
      await apiPatch(`/b2b-requests/${id}`, { status });
      toast.success(`Request status marked as ${status}`);
      qc.invalidateQueries({ queryKey: ["b2b-requests"] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case "contacted":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
      case "reviewed":
        return "bg-sky-50 text-sky-700 border-sky-200/60 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20";
      default:
        return "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "contacted":
        return <CheckCircle2 className="h-3.5 w-3.5 mr-1" />;
      case "reviewed":
        return <PhoneCall className="h-3.5 w-3.5 mr-1" />;
      default:
        return <Clock className="h-3.5 w-3.5 mr-1" />;
    }
  };

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title="B2B Pilot Session Requests"
        subtitle="Manage institute requests, review batch sizes, and track outreach status"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 pb-2">
        <Button
          variant={filterStatus === "" ? "default" : "outline"}
          onClick={() => setFilterStatus("")}
          className="text-xs font-semibold px-4 py-2"
        >
          All Requests
        </Button>
        <Button
          variant={filterStatus === "pending" ? "default" : "outline"}
          onClick={() => setFilterStatus("pending")}
          className="text-xs font-semibold px-4 py-2"
        >
          Pending
        </Button>
        <Button
          variant={filterStatus === "reviewed" ? "default" : "outline"}
          onClick={() => setFilterStatus("reviewed")}
          className="text-xs font-semibold px-4 py-2"
        >
          Reviewed
        </Button>
        <Button
          variant={filterStatus === "contacted" ? "default" : "outline"}
          onClick={() => setFilterStatus("contacted")}
          className="text-xs font-semibold px-4 py-2"
        >
          Contacted
        </Button>
      </div>

      {/* Requests Table/List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-accent-teal" />
          <span className="text-sm text-text-muted-light">Loading pilot requests...</span>
        </div>
      ) : !requests || requests.length === 0 ? (
        <div className="bg-white border border-hairline-light rounded-2xl p-12 text-center max-w-lg mx-auto shadow-elegant">
          <Building className="mx-auto h-12 w-12 text-text-muted-light mb-4" />
          <h3 className="font-display text-xl font-bold text-text-on-light">No requests found</h3>
          <p className="text-sm text-text-muted-light mt-1">
            There are no B2B requests matching this filter status at the moment.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {requests.map((request) => (
            <div
              key={request._id}
              className="bg-white border border-hairline-light rounded-2xl p-6 shadow-elegant transition hover:shadow-md flex flex-col md:flex-row justify-between gap-6"
            >
              {/* Request Info Card */}
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-accent-teal/10 rounded-xl text-accent-teal">
                    <GraduationCap className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-display font-bold text-lg text-text-on-light">{request.college}</h3>
                    <p className="text-xs text-text-muted-light flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {request.city}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-6 text-sm text-text-on-light">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-text-muted-light shrink-0" />
                    <span>
                      <strong>{request.name}</strong> <span className="text-xs text-text-muted-light">({request.designation})</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-text-muted-light shrink-0" />
                    <span>
                      Approx. <strong>{request.students}</strong> Students
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-text-muted-light shrink-0" />
                    <span>
                      Requested: {new Date(request.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-text-muted-light shrink-0" />
                    <a href={`tel:${request.phone}`} className="hover:text-accent-teal underline">
                      {request.phone}
                    </a>
                  </div>

                  <div className="flex items-center gap-2 sm:col-span-2">
                    <Mail className="h-4 w-4 text-text-muted-light shrink-0" />
                    <a href={`mailto:${request.email}`} className="hover:text-accent-teal underline break-all">
                      {request.email}
                    </a>
                  </div>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex md:flex-col justify-between md:justify-center items-end gap-3 pt-4 md:pt-0 border-t md:border-t-0 border-hairline-light">
                <div className="flex items-center">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeStyles(
                      request.status
                    )}`}
                  >
                    {getStatusIcon(request.status)}
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </div>

                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant={request.status === "pending" ? "default" : "outline"}
                    disabled={updatingId === request._id}
                    onClick={() => updateStatus(request._id, "pending")}
                    className="text-xs font-semibold px-2.5 py-1.5 h-auto bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    Pending
                  </Button>
                  <Button
                    size="sm"
                    variant={request.status === "reviewed" ? "default" : "outline"}
                    disabled={updatingId === request._id}
                    onClick={() => updateStatus(request._id, "reviewed")}
                    className="text-xs font-semibold px-2.5 py-1.5 h-auto bg-sky-500 hover:bg-sky-600 text-white"
                  >
                    Reviewed
                  </Button>
                  <Button
                    size="sm"
                    variant={request.status === "contacted" ? "default" : "outline"}
                    disabled={updatingId === request._id}
                    onClick={() => updateStatus(request._id, "contacted")}
                    className="text-xs font-semibold px-2.5 py-1.5 h-auto bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    Contacted
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
