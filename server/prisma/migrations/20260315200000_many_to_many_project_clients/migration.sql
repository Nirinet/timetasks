-- CreateTable: project_clients (many-to-many join table)
CREATE TABLE "project_clients" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,

    CONSTRAINT "project_clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_clients_projectId_idx" ON "project_clients"("projectId");
CREATE INDEX "project_clients_clientId_idx" ON "project_clients"("clientId");
CREATE UNIQUE INDEX "project_clients_projectId_clientId_key" ON "project_clients"("projectId", "clientId");

-- AddForeignKey
ALTER TABLE "project_clients" ADD CONSTRAINT "project_clients_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_clients" ADD CONSTRAINT "project_clients_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- MigrateData: copy existing project-client relationships to join table
INSERT INTO "project_clients" ("id", "projectId", "clientId", "isPrimary", "assignedAt", "assignedBy")
SELECT gen_random_uuid(), p."id", p."clientId", true, p."createdAt", p."createdById"
FROM "projects" p
WHERE p."clientId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_clientId_fkey";

-- DropIndex
DROP INDEX "projects_clientId_idx";

-- AlterTable: remove clientId from projects
ALTER TABLE "projects" DROP COLUMN "clientId";
