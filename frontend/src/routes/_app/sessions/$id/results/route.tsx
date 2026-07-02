import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/brand/PageHeader";
import { LoadingPage } from "@/components/brand/LoadingState";
import { StatCard } from "@/components/brand/StatCard";
import { useAuth } from "@/hooks/useAuth";

interface ResultRow {
  studentId: string;
  name?: string;
  totalScore: number;
  maxScore: number;
  percentScore: number;
}

export const Route = createFileRoute("/_app/sessions/$id/results")({
  ssr: false,
  component: ResultsPage,
});

function ResultsPage() {
  const { role } = useAuth();
  const { id } = Route.useParams();

  const { data: resultsData, isLoading } = useQuery({
    enabled: role !== "student",
    queryKey: ["sessionResults", id],
    queryFn: async () =>
      (await apiGet<{ results: any[] }>(`/evaluations/sessions/${id}/results`)).data,
  });

  const rows = useMemo<ResultRow[]>(() => {
    return (resultsData?.results || []).map((r) => ({
      studentId: r.studentId?._id || r.studentId,
      name: r.studentId?.name || "Unknown",
      totalScore: r.totalScore || 0,
      maxScore: r.maxScore || 0,
      percentScore: r.percentScore || 0,
    }));
  }, [resultsData]);
  const avg =
    rows.length > 0
      ? Math.round(rows.reduce((a, b) => a + b.percentScore, 0) / rows.length)
      : 0;

  if (role === "student") {
    return (
      <div className="max-w-2xl bg-white border border-red-200 rounded-2xl p-8 text-center space-y-4 shadow-elegant mt-6">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-xl text-red-600">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-text-on-light">Access Denied</h2>
        <p className="text-sm text-text-muted-light max-w-md mx-auto">
          Students are not authorized to view the instructor overview results. Please view your results scorecard in your personal dashboard or scorecard view.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingPage title="Loading results" subtitle="Fetching published session results" />;
  }

  return (
    <div>
      <PageHeader
        backUrl={`/sessions/${id}`}
        title="Session results"
        subtitle="instructor overview"
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Students evaluated" value={rows.length} />
        <StatCard label="Average score" value={`${avg}%`} accent="amber" />
        <StatCard
          label="Top score"
          value={`${Math.max(0, ...rows.map((r) => r.percentScore))}%`}
        />
      </div>
      <section className="bg-white border rounded-2xl p-5">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-text-muted-light">
            <tr>
              <th className="py-2">Student</th>
              <th>Total</th>
              <th>Max</th>
              <th className="text-right">Percent</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.studentId} className="border-t">
                <td className="py-3">{r.name || r.studentId}</td>
                <td>{r.totalScore}</td>
                <td>{r.maxScore}</td>
                <td className="text-right font-semibold text-accent-teal">
                  {r.percentScore}%
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={4} className="py-6 text-center text-text-muted-light">No results yet.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
