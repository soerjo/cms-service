-- Add SCHEDULED status to ContentStatus enum
ALTER TYPE "ContentStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED' AFTER 'DRAFT';

-- Add scheduledPublishAt column to content_entries
ALTER TABLE "content_entries" ADD COLUMN IF NOT EXISTS "scheduledPublishAt" TIMESTAMP(3);

-- Index for the scheduler sweep query
CREATE INDEX IF NOT EXISTS "content_entries_scheduled_publish_at_status_idx" ON "content_entries"("scheduledPublishAt", "status");
