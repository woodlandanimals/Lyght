import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireAuth();

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      include: {
        workspace: {
          include: {
            projects: true,
            _count: { select: { members: true } },
          },
        },
      },
    });

    const workspaces = memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
      memberCount: m.workspace._count.members,
    }));

    return NextResponse.json(workspaces);
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { name } = body;
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Workspace name required" }, { status: 400 });
    }

    if (!user.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const slug = String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 50);

    if (!slug) {
      return NextResponse.json({ error: "Invalid workspace name" }, { status: 400 });
    }

    const existing = await prisma.workspace.findUnique({
      where: { organizationId_slug: { organizationId: user.organizationId, slug } },
    });

    if (existing) {
      return NextResponse.json({ error: "Workspace name already taken" }, { status: 400 });
    }

    const workspace = await prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: {
          name: String(name).substring(0, 100),
          slug,
          organizationId: user.organizationId!,
        },
      });

      await tx.workspaceMember.create({
        data: {
          userId: user.id,
          workspaceId: ws.id,
          role: "admin",
        },
      });

      return ws;
    });

    return NextResponse.json(workspace);
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
