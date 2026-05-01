import jwt, { type Secret } from "jsonwebtoken";
import type { Role } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET is required in production");
}

const secret = JWT_SECRET || "dev-only-insecure-secret";

export type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
};

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, secret as Secret, { expiresIn: 60 * 60 * 24 * 7 });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, secret as Secret) as JwtPayload;
  return decoded;
}
