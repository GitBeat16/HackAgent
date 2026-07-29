import { SectionHeader } from "@/components/shared/section-header";
import { PitchForm } from "@/features/meeting-new/components/pitch-form";

export default function NewMeetingPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <SectionHeader
        eyebrow="New session"
        title="Pitch the board"
        description="Fill in what you'd tell a real investor. The board convenes the moment you submit."
      />
      <PitchForm />
    </div>
  );
}
