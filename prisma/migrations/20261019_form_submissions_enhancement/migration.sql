-- CreateEnum
CREATE TYPE "FormSubmissionStatus" AS ENUM ('PENDING', 'PROCESSED', 'SPAM', 'ARCHIVED');

-- AlterTable
ALTER TABLE "form_submissions" ADD COLUMN "status" "FormSubmissionStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "form_submissions" ADD COLUMN "ipAddress" TEXT;
ALTER TABLE "form_submissions" ADD COLUMN "userAgent" TEXT;
ALTER TABLE "form_submissions" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "form_submissions_siteId_status_idx" ON "form_submissions"("siteId", "status");
