"use client";

import Link from "next/link";

interface TopBarProps {
  projectName?: string;
  projectId?: string;
}

export function TopBar({ projectName, projectId }: TopBarProps) {
  return (
    <header className="h-[48px] shrink-0 border-b border-lyght-grey-300/40 bg-white flex items-center justify-between px-4">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-[16px] font-mono font-bold tracking-[0.15em] text-lyght-orange">
            LYGHT
          </span>
        </Link>

        {projectName && projectId && (
          <>
            <span className="text-lyght-grey-300/40">/</span>
            <Link
              href={`/projects/${projectId}/issues`}
              className="text-[13px] font-mono text-lyght-grey-500 hover:text-lyght-black transition-colors"
            >
              {projectName}
            </Link>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <kbd className="text-[11px] text-lyght-grey-500 bg-lyght-grey-300/20 px-1.5 py-0.5 font-mono border border-lyght-grey-300/40">
          C
        </kbd>
        <span className="text-[11px] text-lyght-grey-500 font-mono">QUICK CREATE</span>
      </div>
    </header>
  );
}
