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
