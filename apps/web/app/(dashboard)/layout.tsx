import { redirect } from "next/navigation";
import { cookies } from "next/headers";
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
    redirect("/login");
  }

  // Determine active workspace
  const cookieStore = await cookies();
  const workspaceCookie = cookieStore.get("lyght-workspace")?.value;

  let activeWorkspace = user.workspaceMemberships.find(
    (wm) => wm.workspaceId === workspaceCookie
  )?.workspace;

  if (!activeWorkspace) {
    activeWorkspace = user.workspaceMemberships[0]?.workspace;
  }

  if (!activeWorkspace) {
    redirect("/signup");
  }

  // Get projects in the active workspace
  const workspaceProjects = activeWorkspace.projects || [];
  const firstProject = workspaceProjects[0];
  const projectId = firstProject?.id || "";
  const projectName = firstProject?.name || "";

  // All workspaces for the switcher
  const workspaces = user.workspaceMemberships.map((wm) => ({
    id: wm.workspace.id,
    name: wm.workspace.name,
    slug: wm.workspace.slug,
  }));

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar
        projectName={projectName}
        projectId={projectId}
        workspaceName={activeWorkspace.name}
        userName={user.name}
        userEmail={user.email}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          projectId={projectId}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspace.id}
          activeWorkspaceName={activeWorkspace.name}
          projects={workspaceProjects.map((p) => ({ id: p.id, name: p.name, key: p.key }))}
        />
        <main className="flex-1 overflow-y-auto bg-lyght-white p-6">
          {children}
        </main>
      </div>
      <QuickCreateModal />
    </div>
  );
}
