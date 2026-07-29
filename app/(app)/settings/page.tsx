import { SectionHeader } from "@/components/shared/section-header";
import { SettingsTabs } from "@/features/settings/components/settings-tabs";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <SectionHeader title="Settings" description="Your profile, workspace, notifications, and billing." />
      <SettingsTabs />
    </div>
  );
}
