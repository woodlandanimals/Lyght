import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  const { issueId } = await params;

  const comments = await prisma.comment.findMany({
    where: { issueId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  const { issueId } = await params;
  const user = await getCurrentUser();
  const body = await request.json();

  const comment = await prisma.comment.create({
    data: {
      body: body.body,
      author: body.author || "human",
      issueId,
      userId: user?.id || null,
    },
    include: { user: true },
  });

  return NextResponse.json(comment);
}
