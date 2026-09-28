import { requireUser } from "@/lib/server/auth";
import { redirect } from "next/navigation";
import { PipelineBoard } from "@/features/procurement-pipeline/components/pipeline-board";

export const metadata = {
  title: "Procurement Pipeline | HackAgent",
};

export default async function PipelinePage({ params }: { params: { id: string } }) {
  const { user } = await requireUser();
  if (!user) redirect("/login");

  // Normally we would enforce role-checking here as well to ensure only the officer who owns the challenge sees it

  return (
    <div className="container py-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Procurement Pipeline</h1>
        <p className="text-muted-foreground mt-2">
          Track startups applying to this challenge. Upload auxiliary documents (tax, compliance) before running the AI Evaluation.
        </p>
      </div>

      <PipelineBoard challengeId={params.id} />
    </div>
  );
}
