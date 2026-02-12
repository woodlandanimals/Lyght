"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Popover } from "@/components/ui/popover";

interface TopBarProps {
  projectName?: string;
  projectId?: string;
  workspaceName?: string;
  userName?: string;
  userEmail?: string;
}

export function TopBar({ projectName, projectId, workspaceName, userName, userEmail }: TopBarProps) {
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <header className="h-[48px] shrink-0 border-b border-lyght-grey-300/40 bg-white flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-[16px] font-mono font-bold tracking-[0.15em] text-lyght-orange">
            LYGHT
          </span>
        </Link>

        {workspaceName && (
          <>
            <span className="text-lyght-grey-300">/</span>
            <span className="text-[13px] font-mono text-lyght-grey-500">
              {workspaceName}
            </span>
          </>
        )}

        {projectName && projectId && (
          <>
            <span className="text-lyght-grey-300">/</span>
            <Link
              href={`/projects/${projectId}/issues`}
              className="text-[13px] font-mono text-lyght-grey-700 hover:text-lyght-black transition-colors"
            >
              {projectName}
            </Link>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <kbd className="text-[11px] text-lyght-grey-500 bg-lyght-grey-300/20 px-1.5 py-0.5 font-mono border border-lyght-grey-300/40">
            C
          </kbd>
          <span className="text-[11px] text-lyght-grey-500 font-mono">QUICK CREATE</span>
        </div>

        {/* User Menu */}
        <Popover
          open={userMenuOpen}
          onClose={() => setUserMenuOpen(false)}
          align="right"
          trigger={
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-7 h-7 rounded-full bg-lyght-orange/10 text-lyght-orange text-[11px] font-mono font-bold flex items-center justify-center hover:bg-lyght-orange/20 transition-colors cursor-pointer"
            >
              {initials}
            </button>
          }
        >
          <div className="py-1 min-w-[180px]">
            <div className="px-3 py-2 border-b border-lyght-grey-300/20">
              <div className="text-[13px] font-mono text-lyght-black">{userName}</div>
              <div className="text-[11px] font-mono text-lyght-grey-500">{userEmail}</div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-[13px] font-mono text-lyght-grey-700 hover:bg-lyght-grey-100 transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </Popover>
      </div>
    </header>
  );
}
