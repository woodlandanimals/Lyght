"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { IntegrationCard } from "./integration-card";
import { ConnectModal } from "./connect-modal";
import type { McpPreset } from "@/lib/mcp/presets";

interface IntegrationsPanelProps {
  projectId: string;
}

interface ConnectionData {
  id: string;
  serverId: string;
  name: string;
  status: string;
  enabled: boolean;
  toolsJson: string | null;
  preset: McpPreset;
  toolCount: number;
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  });

export function IntegrationsPanel({ projectId }: IntegrationsPanelProps) {
  const { data, mutate } = useSWR(
    `/api/projects/${projectId}/integrations`,
    fetcher,
    { dedupingInterval: 2000 }
  );

  const [connectPreset, setConnectPreset] = useState<McpPreset | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const connected: ConnectionData[] = data?.connected || [];
  const available: McpPreset[] = data?.available || [];

  const handleDisconnect = useCallback(
    async (connectionId: string) => {
      await fetch(
        `/api/projects/${projectId}/integrations/${connectionId}`,
        { method: "DELETE" }
      );
      mutate();
    },
    [projectId, mutate]
  );

  const handleToggle = useCallback(
    async (connectionId: string, enabled: boolean) => {
      await fetch(
        `/api/projects/${projectId}/integrations/${connectionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled }),
        }
      );
      mutate();
    },
    [projectId, mutate]
  );

  const handleRefresh = useCallback(
    async (connectionId: string) => {
      await fetch(
        `/api/projects/${projectId}/integrations/${connectionId}/test`,
        { method: "POST" }
      );
      mutate();
    },
    [projectId, mutate]
  );

  return (
    <div>
      {/* Connected integrations */}
      {connected.length > 0 && (
        <div className="mb-8">
          <h3 className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500 font-mono mb-3">
            Connected ({connected.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {connected.map((conn) => (
              <div key={conn.id}>
                <IntegrationCard
                  preset={conn.preset}
                  connected={true}
                  status={conn.status}
                  toolCount={conn.toolCount}
                  enabled={conn.enabled}
                  onConnect={() => {}}
                  onDisconnect={() => handleDisconnect(conn.id)}
                  onToggle={(enabled) => handleToggle(conn.id, enabled)}
                  onClick={() =>
                    setExpandedId(expandedId === conn.id ? null : conn.id)
                  }
                />
                {/* Expanded tools list */}
                {expandedId === conn.id && conn.toolsJson && (
                  <ToolsList
                    toolsJson={conn.toolsJson}
                    serverName={conn.preset.name}
                    onRefresh={() => handleRefresh(conn.id)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available integrations */}
      {available.length > 0 && (
        <div>
          <h3 className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500 font-mono mb-3">
            Available
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {available.map((preset) => (
              <IntegrationCard
                key={preset.id}
                preset={preset}
                connected={false}
                onConnect={() => setConnectPreset(preset)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {connected.length === 0 && available.length === 0 && (
        <div className="text-center py-12">
          <div className="text-[24px] mb-3">⊕</div>
          <div className="text-[14px] font-mono text-lyght-black mb-1">
            No integrations available
          </div>
          <div className="text-[12px] font-mono text-lyght-grey-500">
            Integration presets will appear here
          </div>
        </div>
      )}

      {/* Connect modal */}
      {connectPreset && (
        <ConnectModal
          open={true}
          onClose={() => setConnectPreset(null)}
          preset={connectPreset}
          projectId={projectId}
          onConnected={() => {
            mutate();
            setConnectPreset(null);
          }}
        />
      )}
    </div>
  );
}

/* --- Tools list sub-component --- */

function ToolsList({
  toolsJson,
  serverName,
  onRefresh,
}: {
  toolsJson: string;
  serverName: string;
  onRefresh: () => void;
}) {
  let tools: { name: string; description?: string }[] = [];
  try {
    tools = JSON.parse(toolsJson);
  } catch {
    return null;
  }

  if (tools.length === 0) return null;

  return (
    <div className="mt-1 border border-lyght-grey-300/20 rounded-lg bg-lyght-grey-100/30 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500 font-mono">
          {serverName} Tools ({tools.length})
        </span>
        <button
          onClick={onRefresh}
          className="text-[11px] font-mono text-lyght-grey-500 hover:text-lyght-orange cursor-pointer"
        >
          ↻ Refresh
        </button>
      </div>
      <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
        {tools.map((tool) => (
          <div
            key={tool.name}
            className="flex items-start gap-2 text-[12px] font-mono py-1"
          >
            <span className="text-lyght-grey-500 shrink-0">⚙</span>
            <span className="text-lyght-black font-medium">{tool.name}</span>
            {tool.description && (
              <span className="text-lyght-grey-500 truncate">
                — {tool.description}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
