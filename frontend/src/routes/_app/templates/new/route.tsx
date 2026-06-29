import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { apiPost, ApiError } from "@/lib/api";
import type { Template } from "@/lib/types";
import { PageHeader } from "@/components/brand/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/templates/new")({
  ssr: false,
  component: NewTemplate,
});

function NewTemplate() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const t = await apiPost<{ template: Template }>("/templates", { name, description, fields: [] });
      navigate({ to: "/templates/$id", params: { id: t.template._id } });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl">
      <PageHeader
        backUrl="/templates"
        title="New template"
        subtitle="start with a name"
      />
      <form onSubmit={submit} className="bg-white border rounded-2xl p-6 space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading}
          className="bg-accent-teal hover:bg-accent-teal-bright">
          {loading ? "Creating…" : "Create"}
        </Button>
      </form>
    </div>
  );
}
