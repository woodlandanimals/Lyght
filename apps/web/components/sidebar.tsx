"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  projectId: string;
}

const navItems = [
  { label: "Issues", icon: "\u229E", path: "issues" },
  { label: "Projects", icon: "\u25A7", path: "initiatives" },
  { label: "Board", icon: "\u25CE", path: "board" },
  { label: "Swarms", icon: "\u2295", path: "swarms" },
  { label: "AG-DASH", icon: "\u25C8", path: "agents" },
  { label: "Config", icon: "\u2699", path: "settings" },
];

export function Sidebar({ projectId }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav className="w-[160px] shrink-0 border-r border-lyght-grey-300/40 bg-white flex flex-col py-4">
      {navItems.map((item) => {
        const href = `/projects/${projectId}/${item.path}`;
        const isActive = pathname?.includes(`/${item.path}`);

        return (
          <Link
            key={item.path}
            href={href}
            className={`
              flex items-center gap-3 px-4 py-2.5
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
            <span className="text-[16px]">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
