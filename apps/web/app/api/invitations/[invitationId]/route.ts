import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  try {
    const user = await requireAuth();
    const { invitationId } = await params;

    if (!user.organizationId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const orgMembership = user.organizationMemberships.find(
      (m) => m.organizationId === user.organizationId
    );
    if (!orgMembership || orgMembership.role === "member") {
      return NextResponse.json({ error: "Only admins can revoke invitations" }, { status: 403 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation || invitation.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    await prisma.invitation.delete({ where: { id: invitationId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
