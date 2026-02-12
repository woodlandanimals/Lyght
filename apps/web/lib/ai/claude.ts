import Anthropic from "@anthropic-ai/sdk";
import { config } from "dotenv";
import { resolve } from "path";

// Force-load .env.local — overrides empty shell ANTHROPIC_API_KEY if present
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const getClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-key-here") {
    return null;
  }
  return new Anthropic({ apiKey });
};

export async function callClaude(params: {
  system?: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const client = getClient();

  if (!client) {
    return JSON.stringify({
      error: "ANTHROPIC_API_KEY not configured. Set it in .env.local to enable AI features.",
    });
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: params.maxTokens || 4096,
    temperature: params.temperature || 0.3,
    system: params.system,
    messages: params.messages,
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock ? textBlock.text : "";
}

/**
 * Tool definition for Claude API tool-use
 */
export interface ClaudeToolDef {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Enhanced Claude call that supports tool-use conversation loop.
 * When Claude returns tool_use blocks, calls onToolCall for each,
 * then continues the conversation until Claude returns text (no more tools).
 * Caps at maxIterations to prevent runaway loops.
 */
export async function callClaudeWithTools(params: {
  system?: string;
  messages: { role: "user" | "assistant"; content: string }[];
  tools: ClaudeToolDef[];
  maxTokens?: number;
  temperature?: number;
  maxIterations?: number;
  onToolCall: (name: string, args: Record<string, unknown>) => Promise<string>;
}): Promise<{ text: string; toolCallCount: number }> {
  const client = getClient();

  if (!client) {
    return {
      text: JSON.stringify({
        error: "ANTHROPIC_API_KEY not configured. Set it in .env.local to enable AI features.",
      }),
      toolCallCount: 0,
    };
  }

  const maxIter = params.maxIterations || 10;
  let toolCallCount = 0;

  // Build conversation messages — start with the initial messages
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conversationMessages: any[] = params.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  for (let iteration = 0; iteration < maxIter; iteration++) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: params.maxTokens || 8192,
      temperature: params.temperature || 0.3,
      system: params.system,
      messages: conversationMessages,
      tools: params.tools,
    });

    // Check if Claude returned any tool_use blocks
    const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
    const textBlocks = response.content.filter((b) => b.type === "text");

    // If no tool calls, return the text response
    if (toolUseBlocks.length === 0) {
      const text = textBlocks.map((b) => {
        if (b.type === "text") return b.text;
        return "";
      }).join("");
      return { text, toolCallCount };
    }

    // Add assistant's response (with tool_use blocks) to conversation
    conversationMessages.push({
      role: "assistant",
      content: response.content,
    });

    // Process each tool call
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolResults: any[] = [];
    for (const block of toolUseBlocks) {
      if (block.type !== "tool_use") continue;
      toolCallCount++;

      try {
        const result = await params.onToolCall(
          block.name,
          (block.input as Record<string, unknown>) || {}
        );
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        });
      } catch (err) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: `Error: ${err instanceof Error ? err.message : String(err)}`,
          is_error: true,
        });
      }
    }

    // Add tool results to conversation
    conversationMessages.push({
      role: "user",
      content: toolResults,
    });
  }

  // Max iterations reached — return whatever text we have
  return { text: "Max tool iterations reached. Please try again.", toolCallCount };
}

export function estimateCost(inputTokens: number, outputTokens: number): number {
  // Claude Sonnet pricing (approximate)
  const inputCost = (inputTokens / 1_000_000) * 3;
  const outputCost = (outputTokens / 1_000_000) * 15;
  return Math.round((inputCost + outputCost) * 10000) / 10000;
}
