import { cookies } from "next/headers";
import { prisma } from "./prisma";

const SESSION_COOKIE = "lyght-session";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      projects: {
        include: { project: true },
      },
    },
  });

  return user;
}

export async function setSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getFirstProjectId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user || user.projects.length === 0) return null;
  return user.projects[0].projectId;
}

/**
 * Custom error class for auth failures that carries an HTTP status code.
 */
export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

/**
 * Require authentication. Returns the user or throws a 401 response.
 * Use in API routes: const user = await requireAuth();
 */
export async function requireAuth(): Promise<NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("Unauthorized", 401);
  }
  return user;
}

/**
 * Require that the authenticated user has access to a specific project.
 * Returns the user or throws a 401/403 response.
 */
export async function requireProjectAccess(projectId: string): Promise<NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>> {
  const user = await requireAuth();

  const membership = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: user.id, projectId } },
  });

  if (!membership) {
    throw new AuthError("Forbidden: no access to this project", 403);
  }

  return user;
}

/**
 * Wrap an API handler to catch AuthErrors and return appropriate responses.
 */
export function withAuth<T>(
  handler: () => Promise<T>
): Promise<T> {
  return handler();
}

/**
 * Helper to handle AuthError in catch blocks.
 * Usage: catch (error) { const authResponse = handleAuthError(error); if (authResponse) return authResponse; ... }
 */
export function handleAuthError(error: unknown): Response | null {
  if (error instanceof AuthError) {
    return Response.json(
      { error: error.message },
      { status: error.status }
    );
  }
  return null;
}
