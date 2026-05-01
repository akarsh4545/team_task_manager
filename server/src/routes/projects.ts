import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth, requireGlobalAdmin } from "../middleware/auth.js";
import {
  assertProjectAccess,
  assertTeamAdmin,
  countTeamAdmins,
} from "../lib/projectAccess.js";

const router = Router();

const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

const addMemberSchema = z.object({
  email: z.string().email(),
});

const patchMemberRoleSchema = z.object({
  teamRole: z.enum(["TEAM_ADMIN", "TEAM_MEMBER"]),
});

const memberInclude = {
  user: { select: { id: true, email: true, name: true, role: true } },
} as const;

router.use(requireAuth);

router.get("/", async (req: AuthedRequest, res) => {
  const user = req.user!;
  const projects = await prisma.project.findMany({
    where: { members: { some: { userId: user.id } } },
    include: {
      _count: { select: { tasks: true, members: true } },
      members: { include: memberInclude },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(projects);
});

router.post("/", requireGlobalAdmin, async (req: AuthedRequest, res) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const user = req.user!;
  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      creatorId: user.id,
      members: {
        create: { userId: user.id, teamRole: "TEAM_ADMIN" },
      },
    },
    include: {
      members: { include: memberInclude },
    },
  });
  res.status(201).json(project);
});

router.get("/:id", async (req: AuthedRequest, res) => {
  const user = req.user!;
  const err = await assertProjectAccess(user, req.params.id);
  if (err) {
    res.status(err.status).json({ error: err.error });
    return;
  }
  const membership = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: { userId: user.id, projectId: req.params.id },
    },
  });
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: {
      members: { include: memberInclude },
      tasks: {
        include: {
          assignee: { select: { id: true, email: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json({
    ...project,
    viewerTeamRole: membership?.teamRole ?? null,
  });
});

router.post("/:id/members", async (req: AuthedRequest, res) => {
  const parsed = addMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const projectId = req.params.id;
  const adminErr = await assertTeamAdmin(req.user!, projectId);
  if (adminErr) {
    res.status(adminErr.status).json({ error: adminErr.error });
    return;
  }
  const target = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (!target) {
    res.status(404).json({ error: "No user with that email" });
    return;
  }
  try {
    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId: target.id,
        teamRole: "TEAM_MEMBER",
      },
      include: memberInclude,
    });
    res.status(201).json(member);
  } catch {
    res.status(409).json({ error: "User is already a member" });
  }
});

router.patch("/:id/members/:userId", async (req: AuthedRequest, res) => {
  const parsed = patchMemberRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const projectId = req.params.id;
  const targetUserId = req.params.userId;
  const adminErr = await assertTeamAdmin(req.user!, projectId);
  if (adminErr) {
    res.status(adminErr.status).json({ error: adminErr.error });
    return;
  }
  const existing = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: { userId: targetUserId, projectId },
    },
  });
  if (!existing) {
    res.status(404).json({ error: "Member not found on this project" });
    return;
  }
  if (
    parsed.data.teamRole === "TEAM_MEMBER" &&
    existing.teamRole === "TEAM_ADMIN"
  ) {
    const admins = await countTeamAdmins(projectId);
    if (admins <= 1) {
      res.status(400).json({
        error: "Cannot demote the only team admin; promote another admin first",
      });
      return;
    }
  }
  const updated = await prisma.projectMember.update({
    where: { id: existing.id },
    data: { teamRole: parsed.data.teamRole },
    include: memberInclude,
  });
  res.json(updated);
});

router.delete("/:id/members/:userId", async (req: AuthedRequest, res) => {
  const projectId = req.params.id;
  const targetUserId = req.params.userId;
  const adminErr = await assertTeamAdmin(req.user!, projectId);
  if (adminErr) {
    res.status(adminErr.status).json({ error: adminErr.error });
    return;
  }
  const row = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: { userId: targetUserId, projectId },
    },
  });
  if (!row) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  if (row.teamRole === "TEAM_ADMIN") {
    const admins = await countTeamAdmins(projectId);
    if (admins <= 1) {
      res.status(400).json({
        error: "Cannot remove the only team admin; add another admin first",
      });
      return;
    }
  }
  await prisma.projectMember.delete({ where: { id: row.id } });
  res.status(204).send();
});

router.delete("/:id", async (req: AuthedRequest, res) => {
  const projectId = req.params.id;
  const adminErr = await assertTeamAdmin(req.user!, projectId);
  if (adminErr) {
    res.status(adminErr.status).json({ error: adminErr.error });
    return;
  }
  await prisma.project.delete({ where: { id: projectId } });
  res.status(204).send();
});

export default router;
