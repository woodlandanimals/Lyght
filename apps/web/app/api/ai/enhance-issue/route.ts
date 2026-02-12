import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/ai/claude";
import { requireAuth, handleAuthError } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    throw error;
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, description, type } = body;

  const response = await callClaude({
    system: "You are a senior product manager. Enhance the given issue with detailed acceptance criteria, edge cases, and technical considerations. Return only the enhanced description as markdown.",
    messages: [
      {
        role: "user",
        content: `Title: ${title}
Type: ${type || "task"}
Current Description: ${description || "No description yet"}

Enhance this description with:
1. Clear acceptance criteria
2. Edge cases to consider
3. Technical considerations
4. Definition of done

Return ONLY the enhanced markdown description.`,
      },
    ],
  });

  return NextResponse.json({ description: response });
}
