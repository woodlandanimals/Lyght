import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { setSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { token, name, email, password } = body;

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { organization: true },
  });

  if (!invitation) {
    return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
  }

  if (invitation.status !== "pending") {
    return NextResponse.json({ error: "Invitation already used" }, { status: 400 });
  }

  if (new Date() > invitation.expiresAt) {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "expired" },
    });
    return NextResponse.json({ error: "Invitation has expired" }, { status: 400 });
  }

  // Check if user already exists
  let user = await prisma.user.findUnique({ where: { email: invitation.email } });

  if (user) {
    // Existing user — add to org + default workspace
    const result = await prisma.$transaction(async (tx) => {
      // Check not already a member
      const existing = await tx.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: user!.id,
            organizationId: invitation.organizationId,
          },
        },
      });

      if (!existing) {
        await tx.organizationMember.create({
          data: {
            userId: user!.id,
            organizationId: invitation.organizationId,
            role: invitation.role,
          },
        });

        // Update user's organizationId if not set
        if (!user!.organizationId) {
          await tx.user.update({
            where: { id: user!.id },
            data: { organizationId: invitation.organizationId },
          });
        }

        // Add to first workspace in org
        const firstWorkspace = await tx.workspace.findFirst({
          where: { organizationId: invitation.organizationId },
        });

        if (firstWorkspace) {
          await tx.workspaceMember.create({
            data: {
              userId: user!.id,
              workspaceId: firstWorkspace.id,
              role: "member",
            },
          });

          // Add to all projects in that workspace
          const projects = await tx.project.findMany({
            where: { workspaceId: firstWorkspace.id },
          });

          for (const project of projects) {
            const existingProjectMember = await tx.projectMember.findUnique({
              where: {
                userId_projectId: { userId: user!.id, projectId: project.id },
              },
            });
            if (!existingProjectMember) {
              await tx.projectMember.create({
                data: {
                  userId: user!.id,
                  projectId: project.id,
                  role: "member",
                },
              });
            }
          }
        }
      }

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: "accepted" },
      });

      return { userId: user!.id };
    });

    await setSession(result.userId);
    return NextResponse.json({ userId: result.userId });
  }

  // New user — need name and password
  if (!name || !password) {
    return NextResponse.json(
      { error: "Name and password required for new accounts", needsRegistration: true },
      { status: 400 }
    );
  }

  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const passwordHash = hashPassword(password);

  const result = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name: String(name).substring(0, 100),
        email: invitation.email,
        passwordHash,
        organizationId: invitation.organizationId,
      },
    });

    await tx.organizationMember.create({
      data: {
        userId: newUser.id,
        organizationId: invitation.organizationId,
        role: invitation.role,
      },
    });

    // Add to first workspace
    const firstWorkspace = await tx.workspace.findFirst({
      where: { organizationId: invitation.organizationId },
    });

    if (firstWorkspace) {
      await tx.workspaceMember.create({
        data: {
          userId: newUser.id,
          workspaceId: firstWorkspace.id,
          role: "member",
        },
      });

      const projects = await tx.project.findMany({
        where: { workspaceId: firstWorkspace.id },
      });

      for (const project of projects) {
        await tx.projectMember.create({
          data: {
            userId: newUser.id,
            projectId: project.id,
            role: "member",
          },
        });
      }
    }

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { status: "accepted" },
    });

    return { userId: newUser.id };
  });

  await setSession(result.userId);
  return NextResponse.json({ userId: result.userId });
}
