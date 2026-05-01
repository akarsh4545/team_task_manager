import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import type { User } from "@prisma/client";

export type AuthedRequest = Request & { user?: User };

export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Missing authorization token" });
    return;
  }
  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/** Account type chosen at sign-up: only these users may create new projects/teams. */
export function requireGlobalAdmin(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.user.role !== "ADMIN") {
    res.status(403).json({
      error:
        "Member accounts cannot create new projects. Sign up as Admin, or ask a team admin to add you by email.",
    });
    return;
  }
  next();
}
