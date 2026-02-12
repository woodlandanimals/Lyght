import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";
import { QuickCreateModal } from "@/components/issues/quick-create-modal";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/onboarding");
  }

  const firstProject = user.projects[0]?.project;
  const projectId = firstProject?.id || "";
  const projectName = firstProject?.name || "";

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar projectName={projectName} projectId={projectId} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar projectId={projectId} />
        <main className="flex-1 overflow-y-auto bg-lyght-white p-6">
          {children}
        </main>
      </div>
      <QuickCreateModal />
    </div>
  );
}
