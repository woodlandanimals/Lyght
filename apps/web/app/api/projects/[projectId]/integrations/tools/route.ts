import { NextRequest, NextResponse } from "next/server";
import { getProjectTools, invokeTool } from "@/lib/mcp/client";
import { requireAuth, handleAuthError } from "@/lib/auth";

// GET — list all tools across all enabled connections for a project
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    await requireAuth();
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    throw error;
  }

  const { projectId } = await params;
  const tools = await getProjectTools(projectId);

  return NextResponse.json({ tools, count: tools.length });
}

// POST — invoke a specific tool
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    await requireAuth();
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    throw error;
  }

  await params; // consume params

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

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
