import type { User } from "@prisma/client";
import { prisma } from "./prisma.js";

export async function getMembership(userId: string, projectId: string) {
  return prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
}

export async function userCanAccessProject(
  user: User,
  projectId: string
): Promise<boolean> {
  const m = await getMembership(user.id, projectId);
  return !!m;
}

export async function assertProjectAccess(
  user: User,
  projectId: string
): Promise<void | { status: number; error: string }> {
  const ok = await userCanAccessProject(user, projectId);
  if (!ok) return { status: 403, error: "Not a member of this project" };
}

export async function isTeamAdmin(
  userId: string,
  projectId: string
): Promise<boolean> {
  const m = await getMembership(userId, projectId);
  return m?.teamRole === "TEAM_ADMIN";
}

export async function assertTeamAdmin(
  user: User,
  projectId: string
): Promise<void | { status: number; error: string }> {
  const ok = await isTeamAdmin(user.id, projectId);
  if (!ok) {
    return { status: 403, error: "Team admin role required for this action" };
  }
}

export async function countTeamAdmins(projectId: string): Promise<number> {
  return prisma.projectMember.count({
    where: { projectId, teamRole: "TEAM_ADMIN" },
  });
}

export async function assertAssigneeInProject(
  projectId: string,
  assigneeId: string | null | undefined
): Promise<{ status: number; error: string } | null> {
  if (!assigneeId) return null;
  const m = await prisma.projectMember.findFirst({
    where: { userId: assigneeId, projectId },
  });
  if (!m) return { status: 400, error: "Assignee must be a project member" };
  return null;
}
