import { SectionHeader } from "@/components/shared/section-header";
import { SettingsTabs } from "@/features/settings/components/settings-tabs";

export default function SettingsPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto py-8">
      <SectionHeader title="Profile Settings" description="Manage your government or startup profile credentials." />
      <SettingsTabs />
    </div>
  );
}
