import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import type { Template } from "@/lib/types";
import { PageHeader } from "@/components/brand/PageHeader";
import { CornerPillBadge } from "@/components/brand/CornerPillBadge";
import { Button } from "@/components/ui/button";
import { Plus, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/templates/")({
  ssr: false,
  component: TemplatesList,
});

function TemplatesList() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => (await apiGet<Template[]>("/templates")).data,
  });

  const duplicate = async (id: string) => {
    try {
      await apiPost(`/templates/${id}/duplicate`);
      toast.success("Duplicated");
      qc.invalidateQueries({ queryKey: ["templates"] });
    } catch (e) { toast.error(e instanceof ApiError ? e.message : "Failed"); }
  };

  return (
    <div>
      <PageHeader
        title="Templates"
        subtitle="design your evaluation rubrics"
        actions={
          <Link to="/templates/new">
            <Button className="bg-accent-teal hover:bg-accent-teal-bright">
              <Plus className="h-4 w-4 mr-1" /> New template
            </Button>
          </Link>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(data || []).map((t) => (
          <div key={t._id}
            className="bg-white border rounded-2xl p-5 flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <Link to="/templates/$id" params={{ id: t._id }}
                className="font-display font-semibold text-lg hover:text-accent-teal">
                {t.name}
              </Link>
              <CornerPillBadge tone={t.status === "published" ? "teal" : "dark"}>
                {t.status}
              </CornerPillBadge>
            </div>
            {t.description && (
              <p className="text-sm text-text-muted-light mt-2 line-clamp-2 flex-1">
                {t.description}
              </p>
            )}
            <div className="mt-3 flex items-center justify-between text-xs text-text-muted-light">
              <span>{t.fields?.length || 0} fields</span>
              <button onClick={() => duplicate(t._id)}
                className="text-accent-teal hover:underline inline-flex items-center gap-1">
                <Copy className="h-3.5 w-3.5" /> Duplicate
              </button>
            </div>
          </div>
        ))}
        {!data?.length && (
          <div className="text-text-muted-light col-span-full text-center py-10">
            No templates yet.
          </div>
        )}
      </div>
    </div>
  );
}
