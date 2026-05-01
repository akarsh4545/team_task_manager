import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";
import {
  assertProjectAccess,
  assertAssigneeInProject,
  isTeamAdmin,
  assertTeamAdmin,
} from "../lib/projectAccess.js";

const router = Router({ mergeParams: true });

const createTaskSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeId: z.string().min(1).optional().nullable(),
});

const patchTaskSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeId: z.string().min(1).optional().nullable(),
});

router.use(requireAuth);

router.get("/", async (req: AuthedRequest, res) => {
  const user = req.user!;
  const projectId = req.params.projectId as string;
  const err = await assertProjectAccess(user, projectId);
  if (err) {
    res.status(err.status).json({ error: err.error });
    return;
  }
  const tasks = await prisma.task.findMany({
    where: { projectId },
    include: { assignee: { select: { id: true, email: true, name: true } } },
    orderBy: { updatedAt: "desc" },
  });
  res.json(tasks);
});

router.post("/", async (req: AuthedRequest, res) => {
  const user = req.user!;
  const projectId = req.params.projectId as string;
  const accessErr = await assertProjectAccess(user, projectId);
  if (accessErr) {
    res.status(accessErr.status).json({ error: accessErr.error });
    return;
  }
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const admin = await isTeamAdmin(user.id, projectId);
  if (!admin) {
    const aid = parsed.data.assigneeId;
    if (aid && aid !== user.id) {
      res.status(403).json({
        error: "Team members can only assign new tasks to themselves",
      });
      return;
    }
  }
  const assigneeErr = await assertAssigneeInProject(
    projectId,
    parsed.data.assigneeId ?? undefined
  );
  if (assigneeErr) {
    res.status(assigneeErr.status).json({ error: assigneeErr.error });
    return;
  }
  const dueDate =
    parsed.data.dueDate === undefined
      ? undefined
      : parsed.data.dueDate
        ? new Date(parsed.data.dueDate)
        : null;
  const task = await prisma.task.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status ?? "TODO",
      dueDate,
      projectId,
      assigneeId: parsed.data.assigneeId ?? null,
    },
    include: { assignee: { select: { id: true, email: true, name: true } } },
  });
  res.status(201).json(task);
});

const taskRouter = Router();
taskRouter.use(requireAuth);

taskRouter.patch("/:taskId", async (req: AuthedRequest, res) => {
  const user = req.user!;
  const parsed = patchTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  if (Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  const task = await prisma.task.findUnique({
    where: { id: req.params.taskId },
  });
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const accessErr = await assertProjectAccess(user, task.projectId);
  if (accessErr) {
    res.status(accessErr.status).json({ error: accessErr.error });
    return;
  }
  const admin = await isTeamAdmin(user.id, task.projectId);
  if (!admin) {
    if (task.assigneeId !== user.id) {
      res.status(403).json({ error: "You can only update tasks assigned to you" });
      return;
    }
    const forbidden = ["title", "description", "assigneeId"].some(
      (k) => (parsed.data as Record<string, unknown>)[k] !== undefined
    );
    if (forbidden) {
      res.status(403).json({
        error: "Team members may only update status and due date on assigned tasks",
      });
      return;
    }
  }
  if (parsed.data.assigneeId !== undefined) {
    const aerr = await assertAssigneeInProject(task.projectId, parsed.data.assigneeId);
    if (aerr) {
      res.status(aerr.status).json({ error: aerr.error });
      return;
    }
  }
  const dueDate =
    parsed.data.dueDate === undefined
      ? undefined
      : parsed.data.dueDate === null
        ? null
        : new Date(parsed.data.dueDate);
  const updated = await prisma.task.update({
    where: { id: task.id },
    data: {
      ...("title" in parsed.data && parsed.data.title !== undefined
        ? { title: parsed.data.title }
        : {}),
      ...("description" in parsed.data
        ? { description: parsed.data.description ?? null }
        : {}),
      ...("status" in parsed.data && parsed.data.status !== undefined
        ? { status: parsed.data.status }
        : {}),
      ...(dueDate !== undefined ? { dueDate } : {}),
      ...("assigneeId" in parsed.data
        ? { assigneeId: parsed.data.assigneeId }
        : {}),
    },
    include: { assignee: { select: { id: true, email: true, name: true } } },
  });
  res.json(updated);
});

taskRouter.delete("/:taskId", async (req: AuthedRequest, res) => {
  const user = req.user!;
  const task = await prisma.task.findUnique({
    where: { id: req.params.taskId },
  });
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const adminErr = await assertTeamAdmin(user, task.projectId);
  if (adminErr) {
    res.status(adminErr.status).json({ error: adminErr.error });
    return;
  }
  await prisma.task.delete({ where: { id: task.id } });
  res.status(204).send();
});

export { taskRouter };
export default router;
