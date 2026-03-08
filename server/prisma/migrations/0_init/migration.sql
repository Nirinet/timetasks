-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EMPLOYEE', 'CLIENT');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'WAITING_CLIENT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('URGENT_IMPORTANT', 'IMPORTANT', 'NORMAL', 'LOW');

-- CreateEnum
CREATE TYPE "TimerStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('NEW_TASK', 'STATUS_CHANGE', 'NEW_COMMENT', 'TASK_ASSIGNMENT', 'DEADLINE_APPROACHING', 'DEADLINE_EXCEEDED', 'ACTIVE_TIMER', 'NEW_FILE', 'PRIORITY_CHANGE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLogin" TIMESTAMP(3),
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "timerAlerts" BOOLEAN NOT NULL DEFAULT true,
    "language" TEXT NOT NULL DEFAULT 'he',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "joinDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetDate" TIMESTAMP(3),
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "hoursBudget" DOUBLE PRECISION,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "clientId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "status" "TaskStatus" NOT NULL DEFAULT 'NEW',
    "creationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline" TIMESTAMP(3),
    "timeEstimate" DOUBLE PRECISION,
    "parentTaskId" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_assignments" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT,
    "clientId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,

    CONSTRAINT "task_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_records" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "description" TEXT,
    "status" "TimerStatus" NOT NULL DEFAULT 'ACTIVE',
    "taskId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "taskId" TEXT,
    "projectId" TEXT,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_attachments" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "taskId" TEXT,
    "commentId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "senderId" TEXT,
    "receiverId" TEXT NOT NULL,
    "taskId" TEXT,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_change_history" (
    "id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "action" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_change_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "projects_clientId_idx" ON "projects"("clientId");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "tasks_projectId_idx" ON "tasks"("projectId");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_parentTaskId_idx" ON "tasks"("parentTaskId");

-- CreateIndex
CREATE INDEX "tasks_creationDate_idx" ON "tasks"("creationDate");

-- CreateIndex
CREATE INDEX "task_assignments_clientId_idx" ON "task_assignments"("clientId");

-- CreateIndex
CREATE INDEX "task_assignments_userId_idx" ON "task_assignments"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "task_assignments_taskId_userId_key" ON "task_assignments"("taskId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "task_assignments_taskId_clientId_key" ON "task_assignments"("taskId", "clientId");

-- CreateIndex
CREATE INDEX "time_records_employeeId_idx" ON "time_records"("employeeId");

-- CreateIndex
CREATE INDEX "time_records_taskId_idx" ON "time_records"("taskId");

-- CreateIndex
CREATE INDEX "time_records_date_idx" ON "time_records"("date");

-- CreateIndex
CREATE INDEX "time_records_status_idx" ON "time_records"("status");

-- CreateIndex
CREATE INDEX "comments_taskId_idx" ON "comments"("taskId");

-- CreateIndex
CREATE INDEX "comments_projectId_idx" ON "comments"("projectId");

-- CreateIndex
CREATE INDEX "file_attachments_taskId_idx" ON "file_attachments"("taskId");

-- CreateIndex
CREATE INDEX "file_attachments_commentId_idx" ON "file_attachments"("commentId");

-- CreateIndex
CREATE INDEX "alerts_receiverId_isRead_idx" ON "alerts"("receiverId", "isRead");

-- CreateIndex
CREATE INDEX "task_change_history_taskId_idx" ON "task_change_history"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_records" ADD CONSTRAINT "time_records_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_records" ADD CONSTRAINT "time_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_attachments" ADD CONSTRAINT "file_attachments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_attachments" ADD CONSTRAINT "file_attachments_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_attachments" ADD CONSTRAINT "file_attachments_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_change_history" ADD CONSTRAINT "task_change_history_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

