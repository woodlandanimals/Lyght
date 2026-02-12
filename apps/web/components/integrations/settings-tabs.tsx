"use client";

import { useState } from "react";
import { IntegrationsPanel } from "./integrations-panel";

interface SettingsTabsProps {
  projectId: string;
}

const tabs = [
  { id: "integrations", label: "Integrations" },
  { id: "general", label: "General" },
];

export function SettingsTabs({ projectId }: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState("integrations");

  return (
    <div className="max-w-3xl">
      <h1 className="text-[20px] font-mono font-bold text-lyght-black mb-6">CONFIG</h1>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 mb-6 border-b border-lyght-grey-300/20">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              text-[11px] uppercase tracking-[0.1em] font-mono px-4 py-2.5
              transition-colors cursor-pointer
              ${
                activeTab === tab.id
                  ? "text-lyght-orange border-b-2 border-lyght-orange -mb-[1px]"
                  : "text-lyght-grey-500 hover:text-lyght-black"
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "integrations" && (
        <IntegrationsPanel projectId={projectId} />
      )}

      {activeTab === "general" && (
        <div className="border border-lyght-grey-300/20 p-4 rounded-lg">
          <div className="flex flex-col gap-4">
            <div>
              <span className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500 font-mono block mb-1">
                Project ID
              </span>
              <span className="text-[13px] text-lyght-black font-mono">
                {projectId}
              </span>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500 font-mono block mb-1">
                AI Model
              </span>
              <span className="text-[13px] text-lyght-black font-mono">
                claude-sonnet-4-20250514
              </span>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500 font-mono block mb-1">
                Rate Limit
              </span>
              <span className="text-[13px] text-lyght-black font-mono">
                30 requests / minute
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
