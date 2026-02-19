"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Popover } from "@/components/ui/popover";

interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
}

interface ProjectInfo {
  id: string;
  name: string;
  key: string;
}

interface SidebarProps {
  projectId: string;
  workspaces: WorkspaceInfo[];
  activeWorkspaceId: string;
  activeWorkspaceName: string;
  projects: ProjectInfo[];
}

const navItems = [
  { label: "Issues", icon: "\u229E", path: "issues" },
  { label: "Projects", icon: "\u25A7", path: "initiatives" },
  { label: "Board", icon: "\u25CE", path: "board" },
  { label: "Swarms", icon: "\u2295", path: "swarms" },
  { label: "AG-DASH", icon: "\u25C8", path: "agents" },
  { label: "Config", icon: "\u2699", path: "settings" },
];

export function Sidebar({
  projectId,
  workspaces,
  activeWorkspaceId,
  activeWorkspaceName,
  projects,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [wsOpen, setWsOpen] = useState(false);

  async function switchWorkspace(workspaceId: string) {
    setWsOpen(false);
    const res = await fetch("/api/workspaces/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId }),
    });
    const data = await res.json();
    if (data.firstProjectId) {
      router.push(`/projects/${data.firstProjectId}/issues`);
    }
    router.refresh();
  }

  return (
    <nav className="w-[200px] shrink-0 border-r border-lyght-grey-300/40 bg-white flex flex-col py-3 justify-between">
      <div>
        {/* Workspace Switcher */}
        <div className="px-3 mb-3">
          <Popover
            open={wsOpen}
            onClose={() => setWsOpen(false)}
            trigger={
              <button
                onClick={() => setWsOpen(!wsOpen)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-lyght-grey-100 transition-colors cursor-pointer"
              >
                <span className="text-[13px] font-mono font-semibold text-lyght-black truncate">
                  {activeWorkspaceName}
                </span>
                <span className="text-[10px] text-lyght-grey-500 ml-1">&#9662;</span>
              </button>
            }
          >
            <div className="py-1">
              <div className="px-3 py-1.5">
                <span className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500 font-mono">
                  Workspaces
                </span>
              </div>
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => switchWorkspace(ws.id)}
                  className={`w-full text-left px-3 py-1.5 text-[13px] font-mono transition-colors cursor-pointer ${
                    ws.id === activeWorkspaceId
                      ? "text-lyght-orange bg-lyght-orange/5"
                      : "text-lyght-grey-700 hover:bg-lyght-grey-100"
                  }`}
                >
                  {ws.name}
                </button>
              ))}
            </div>
          </Popover>
        </div>

        <div className="h-px bg-lyght-grey-300/20 mx-3 mb-3" />

        {/* Projects */}
        {projects.length > 1 && (
          <>
            <div className="px-4 mb-1">
              <span className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500 font-mono">
                Projects
              </span>
            </div>
            {projects.map((project) => {
              const isActive = pathname?.includes(`/projects/${project.id}`);
              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}/issues`}
                  className={`
                    flex items-center gap-2 px-4 py-1.5
                    text-[12px] font-mono
                    transition-colors duration-100
                    mx-2 rounded-md
                    ${
                      isActive
                        ? "text-lyght-orange bg-lyght-orange/5"
                        : "text-lyght-grey-500 hover:text-lyght-black hover:bg-lyght-grey-100"
                    }
                  `}
                >
                  <span className="text-lyght-grey-300">{project.key}</span>
                  <span className="truncate">{project.name}</span>
                </Link>
              );
            })}
            <div className="h-px bg-lyght-grey-300/20 mx-3 my-3" />
          </>
        )}

        {/* Navigation */}
        {navItems.map((item) => {
          const href = `/projects/${projectId}/${item.path}`;
          const isActive = pathname?.includes(`/${item.path}`);

          return (
            <Link
              key={item.path}
              href={href}
              className={`
                flex items-center gap-3 px-4 py-2
                text-[13px] font-mono
                transition-colors duration-100
                rounded-md mx-2
                ${
                  isActive
                    ? "text-lyght-orange bg-lyght-orange/5 border-l-2 border-lyght-orange"
                    : "text-lyght-grey-500 hover:text-lyght-black hover:bg-lyght-grey-100"
                }
              `}
            >
              <span className="text-[15px]">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Bottom: Org Settings */}
      <div className="px-3 pt-3 border-t border-lyght-grey-300/20">
        <Link
          href="/settings/organization"
          className="flex items-center gap-2 px-2 py-1.5 text-[12px] font-mono text-lyght-grey-500 hover:text-lyght-black hover:bg-lyght-grey-100 rounded-md transition-colors"
        >
          <span className="text-[14px]">&#9881;</span>
          <span>Organization</span>
        </Link>
      </div>
    </nav>
  );
}
