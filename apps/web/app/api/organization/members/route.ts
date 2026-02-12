import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireAuth();

    if (!user.organizationId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const members = await prisma.organizationMember.findMany({
      where: { organizationId: user.organizationId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { user: { name: "asc" } },
    });

    return NextResponse.json(members);
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
