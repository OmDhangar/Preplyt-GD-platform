import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { TemplateField } from "@/lib/types";
import { PageHeader } from "@/components/brand/PageHeader";
import { LoadingPage } from "@/components/brand/LoadingState";
import { StatCard } from "@/components/brand/StatCard";
import { FieldRenderer } from "@/components/rubric/FieldRenderer";
import { fieldValuesArrayToMap } from "@/lib/rubric";

interface PublishedResult {
  sessionTitle?: string;
  studentName?: string;
  totalScore: number;
  maxScore: number;
  percentScore: number;
  fields: TemplateField[];
  fieldValues: { fieldId: string; value: unknown }[];
}

export const Route = createFileRoute("/_app/results/$sessionId")({
  ssr: false,
  component: StudentResults,
});

function StudentResults() {
  const { sessionId } = Route.useParams();
  const { data: resultsData, isLoading } = useQuery({
    queryKey: ["myResults", sessionId],
    queryFn: async () =>
      (await apiGet<{ results: any[] }>(
        `/evaluations/sessions/${sessionId}/results`,
      )).data,
  });

  const record = resultsData?.results?.[0];

  if (isLoading) {
    return <LoadingPage title="Loading your results" subtitle="Fetching published feedback and scores" />;
  }
  if (!record) {
    return (
      <div className="bg-white border rounded-2xl p-8 text-center text-text-muted-light">
        No published results are available for this session yet.
      </div>
    );
  }
  const valueMap = fieldValuesArrayToMap(record.fieldValues || []);

  const data: PublishedResult = {
    sessionTitle: record.templateId?.name,
    studentName: record.studentId?.name,
    totalScore: record.totalScore || 0,
    maxScore: record.maxScore || 0,
    percentScore: record.percentScore || 0,
    fields: record.templateId?.fields || [],
    fieldValues: record.fieldValues || [],
  };

  return (
    <div>
      <PageHeader
        title={data.sessionTitle || "Your results"}
        subtitle="published feedback"
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total score" value={data.totalScore} />
        <StatCard label="Max possible" value={data.maxScore} accent="amber" />
        <StatCard label="Percent" value={`${data.percentScore}%`} />
      </div>
      <section className="bg-white border rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold mb-5">Breakdown</h2>
        <div className="space-y-5">
          {data.fields.map((f) => (
            <FieldRenderer
              key={f.fieldId}
              field={f}
              value={valueMap[f.fieldId]}
              readOnly
            />
          ))}
        </div>
      </section>
    </div>
  );
}
