import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120),
  /** Account type: Admin can create teams/projects; Member joins teams when invited. */
  role: z.enum(["ADMIN", "MEMBER"]),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password, name, role } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, name, role },
  });
  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      capabilities: {
        canCreateProjects: user.role === "ADMIN",
        canJoinTeamsWhenInvited: true,
      },
    },
  });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      capabilities: {
        canCreateProjects: user.role === "ADMIN",
        canJoinTeamsWhenInvited: true,
      },
    },
  });
});

router.get("/me", requireAuth, (req: AuthedRequest, res) => {
  const u = req.user!;
  res.json({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    capabilities: {
      canCreateProjects: u.role === "ADMIN",
      canJoinTeamsWhenInvited: true,
    },
  });
});

export default router;
