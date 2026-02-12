"use client";

import { StatusLed } from "@/components/ui/status-led";
import { Button } from "@/components/ui/button";
import type { McpPreset } from "@/lib/mcp/presets";

interface IntegrationCardProps {
  preset: McpPreset;
  connected: boolean;
  status?: string;
  toolCount?: number;
  enabled?: boolean;
  onConnect: () => void;
  onDisconnect?: () => void;
  onToggle?: (enabled: boolean) => void;
  onClick?: () => void;
  loading?: boolean;
}

const statusToLed: Record<string, string> = {
  connected: "done",
  disconnected: "idle",
  error: "blocked",
};

export function IntegrationCard({
  preset,
  connected,
  status = "disconnected",
  toolCount = 0,
  enabled = true,
  onConnect,
  onDisconnect,
  onToggle,
  onClick,
  loading,
}: IntegrationCardProps) {
  return (
    <div
      className={`
        border rounded-lg p-4 transition-all duration-150
        ${connected
          ? "border-lyght-grey-300/40 bg-white hover:border-lyght-grey-300/60"
          : "border-lyght-grey-300/20 bg-lyght-grey-100/30 hover:border-lyght-grey-300/40"
        }
        ${onClick ? "cursor-pointer" : ""}
      `}
      onClick={onClick}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 mb-2">
        <span
          className="text-[20px] w-8 h-8 flex items-center justify-center rounded-md"
          style={{ backgroundColor: `${preset.color}15`, color: preset.color }}
        >
          {preset.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-mono font-medium text-lyght-black">
              {preset.name}
            </span>
            <StatusLed status={statusToLed[status] || "idle"} size="sm" />
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-[12px] font-mono text-lyght-grey-500 mb-3 leading-relaxed">
        {preset.description}
      </p>

      {/* Status info + actions */}
      {connected ? (
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-lyght-grey-500">
            {status === "error" ? (
              <span className="text-red-500">Connection error</span>
            ) : preset.id === "claude-tools" ? (
              <span className="text-lyght-orange">Enabled</span>
            ) : (
              <span className="text-lyght-green">{toolCount} tools available</span>
            )}
          </span>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {onToggle && (
              <button
                onClick={() => onToggle(!enabled)}
                className={`
                  text-[11px] font-mono uppercase tracking-[0.05em] px-2 py-1 rounded
                  transition-colors cursor-pointer
                  ${enabled
                    ? "text-lyght-grey-500 hover:text-lyght-black hover:bg-lyght-grey-100"
                    : "text-lyght-orange hover:bg-lyght-orange/10"
                  }
                `}
              >
                {enabled ? "Disable" : "Enable"}
              </button>
            )}
            {onDisconnect && (
              <button
                onClick={onDisconnect}
                className="text-[11px] font-mono uppercase tracking-[0.05em] text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      ) : (
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onConnect();
          }}
          loading={loading}
          className="w-full text-[11px]"
        >
          CONNECT
        </Button>
      )}
    </div>
  );
}
