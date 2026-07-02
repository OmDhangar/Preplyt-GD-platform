import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
  const [selectedInstructorIndex, setSelectedInstructorIndex] = useState(0);
  
  const { data: resultsData, isLoading } = useQuery({
    queryKey: ["myResults", sessionId],
    queryFn: async () =>
      (await apiGet<{ results: any[] }>(
        `/evaluations/sessions/${sessionId}/results`,
      )).data,
  });

  const records = resultsData?.results || [];
  const record = records[selectedInstructorIndex] || records[0];

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
        subtitle={`Evaluation by ${record.instructorId?.name || "Instructor"}`}
      />

      {records.length > 1 && (
        <div className="flex gap-2 p-1.5 bg-bg-dark-light/5 border rounded-2xl mb-6 max-w-lg shadow-sm">
          {records.map((r, idx) => (
            <button
              key={r._id}
              onClick={() => setSelectedInstructorIndex(idx)}
              className={
                "flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 " +
                (selectedInstructorIndex === idx
                  ? "bg-accent-teal text-white shadow-md shadow-accent-teal/10 scale-[1.02]"
                  : "text-text-muted-light hover:text-text-on-light hover:bg-bg-dark-light/5")
              }
            >
              {r.instructorId?.name || `Instructor ${idx + 1}`}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total score" value={data.totalScore} />
        <StatCard label="Max possible" value={data.maxScore} accent="amber" />
        <StatCard label="Percent" value={`${data.percentScore}%`} />
      </div>

      {record.overallComment && (
        <section className="bg-white border rounded-2xl p-6 mb-6">
          <h2 className="font-display text-lg font-semibold mb-3">Overall Comments</h2>
          <p className="text-sm text-text-on-light leading-relaxed whitespace-pre-line bg-bg-dark-light/5 p-4 rounded-xl border">
            {record.overallComment}
          </p>
        </section>
      )}

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
