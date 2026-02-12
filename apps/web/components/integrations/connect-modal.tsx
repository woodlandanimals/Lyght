"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { McpPreset } from "@/lib/mcp/presets";

interface ConnectModalProps {
  open: boolean;
  onClose: () => void;
  preset: McpPreset;
  projectId: string;
  onConnected: () => void;
}

export function ConnectModal({
  open,
  onClose,
  preset,
  projectId,
  onConnected,
}: ConnectModalProps) {
  const [url, setUrl] = useState(preset.defaultUrl);
  const [authToken, setAuthToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    toolCount?: number;
    error?: string;
  } | null>(null);

  const isClaudeTools = preset.id === "claude-tools";

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/integrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverId: preset.id,
          url: url || undefined,
          authToken: authToken || undefined,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setTestResult({
          success: true,
          toolCount: data.discovery?.tools?.length || 0,
        });
        // Connection was created during test — done!
        onConnected();
        onClose();
      } else {
        setTestResult({
          success: false,
          error: data.discovery?.error || data.error || "Connection failed",
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        error: err instanceof Error ? err.message : "Connection failed",
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleConnect() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/integrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverId: preset.id,
          url: url || undefined,
          authToken: authToken || undefined,
        }),
      });
      const data = await res.json();

      if (data.success || res.ok) {
        onConnected();
        onClose();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isClaudeTools ? "Enable Claude Tools" : `Connect ${preset.name}`}
    >
      {isClaudeTools ? (
        /* Claude Tools — no auth needed */
        <div className="flex flex-col gap-4">
          <p className="text-[13px] font-mono text-lyght-grey-700 leading-relaxed">
            Enhanced Claude with tool-use — agents can call tools from other
            connected MCP servers during planning and execution.
          </p>
          <p className="text-[12px] font-mono text-lyght-grey-500">
            No additional setup required. Connect other integrations (Figma,
            Slack, etc.) first, then enable this to let Claude agents use those
            tools automatically.
          </p>
          <Button onClick={handleConnect} loading={loading}>
            ENABLE
          </Button>
        </div>
      ) : (
        /* Token-based auth */
        <div className="flex flex-col gap-4">
          {/* Server URL */}
          <div>
            <label className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500 font-mono block mb-1">
              Server URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={preset.defaultUrl || "https://..."}
              className="w-full px-3 py-2 text-[13px] font-mono border border-lyght-grey-300 rounded-md bg-white focus:outline-none focus:border-lyght-orange"
            />
          </div>

          {/* Auth Token */}
          {preset.authType === "token" && (
            <div>
              <label className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500 font-mono block mb-1">
                {preset.authLabel || "Access Token"}
              </label>
              <input
                type="password"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder={preset.authPlaceholder || "Token..."}
                className="w-full px-3 py-2 text-[13px] font-mono border border-lyght-grey-300 rounded-md bg-white focus:outline-none focus:border-lyght-orange"
              />
            </div>
          )}

          {/* Setup instructions */}
          <div className="text-[11px] font-mono text-lyght-grey-500 bg-lyght-grey-100/50 rounded-md p-3">
            <span className="font-medium text-lyght-grey-700">Setup: </span>
            {preset.setupInstructions}
            {preset.docsUrl && (
              <>
                {" "}
                <a
                  href={preset.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lyght-orange hover:underline"
                >
                  Docs →
                </a>
              </>
            )}
          </div>

          {/* Test result */}
          {testResult && (
            <div
              className={`text-[12px] font-mono rounded-md p-2 ${
                testResult.success
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {testResult.success
                ? `✓ Connected — ${testResult.toolCount} tools discovered`
                : `✗ ${testResult.error}`}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleTestConnection}
              loading={testing}
              className="flex-1"
            >
              CONNECT & TEST
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
