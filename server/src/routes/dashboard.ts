import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req: AuthedRequest, res) => {
  const user = req.user!;
  const projectFilter = {
    project: { members: { some: { userId: user.id } } },
  };

  const tasks = await prisma.task.findMany({
    where: projectFilter,
    select: {
      id: true,
      status: true,
      dueDate: true,
      title: true,
      projectId: true,
      project: { select: { name: true } },
    },
  });

  const now = new Date();
  const counts = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
  let overdue = 0;
  const overdueList: {
    id: string;
    title: string;
    dueDate: Date;
    projectName: string;
  }[] = [];

  for (const t of tasks) {
    counts[t.status]++;
    if (t.dueDate && t.dueDate < now && t.status !== "DONE") {
      overdue++;
      overdueList.push({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        projectName: t.project.name,
      });
    }
  }

  overdueList.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  res.json({
    totalTasks: tasks.length,
    byStatus: counts,
    overdueCount: overdue,
    overdueTasks: overdueList.slice(0, 20),
  });
});

export default router;
