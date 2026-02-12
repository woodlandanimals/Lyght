import { SettingsTabs } from "@/components/integrations/settings-tabs";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return <SettingsTabs projectId={projectId} />;
}
