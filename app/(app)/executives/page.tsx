import { SectionHeader } from "@/components/shared/section-header";
import { ExecutiveDirectory } from "@/features/executives/components/executive-directory";

export default function ExecutivesPage() {
  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="The board"
        title="Executives"
        description="Eight fixed points of view. Add or remove agents from a session on the New Meeting screen."
      />
      <ExecutiveDirectory />
    </div>
  );
}
