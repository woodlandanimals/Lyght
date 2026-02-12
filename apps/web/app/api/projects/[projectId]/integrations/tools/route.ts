import { NextRequest, NextResponse } from "next/server";
import { getProjectTools, invokeTool } from "@/lib/mcp/client";

// GET — list all tools across all enabled connections for a project
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const tools = await getProjectTools(projectId);

  return NextResponse.json({ tools, count: tools.length });
}

// POST — invoke a specific tool
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  await params; // consume params
  const body = await request.json();
  const { connectionId, toolName, args = {} } = body;

  if (!connectionId || !toolName) {
    return NextResponse.json(
      { error: "connectionId and toolName required" },
      { status: 400 }
    );
  }

  const result = await invokeTool(connectionId, toolName, args);

  return NextResponse.json(result);
}
