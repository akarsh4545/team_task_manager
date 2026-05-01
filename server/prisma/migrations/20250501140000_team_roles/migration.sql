-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('TEAM_ADMIN', 'TEAM_MEMBER');

-- AlterTable
ALTER TABLE "ProjectMember" ADD COLUMN "teamRole" "TeamRole" NOT NULL DEFAULT 'TEAM_MEMBER';

-- Backfill: project creator is team admin for their membership row
UPDATE "ProjectMember" pm
SET "teamRole" = 'TEAM_ADMIN'
FROM "Project" p
WHERE pm."projectId" = p."id" AND pm."userId" = p."creatorId";
