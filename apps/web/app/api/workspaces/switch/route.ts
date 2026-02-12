import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, setActiveWorkspace, handleAuthError } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { workspaceId } = body;
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId } },
      include: {
        workspace: {
          include: { projects: true },
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "No access to this workspace" }, { status: 403 });
    }

    await setActiveWorkspace(workspaceId);

    const firstProjectId = membership.workspace.projects[0]?.id || null;

    return NextResponse.json({
      workspaceId,
      workspaceName: membership.workspace.name,
      firstProjectId,
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
