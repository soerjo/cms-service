-- AlterTable
ALTER TABLE "media_assets" ADD COLUMN "isAttached" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "media_assets" ADD COLUMN "attachedEntryId" TEXT;
ALTER TABLE "media_assets" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "media_assets_isAttached_deletedAt_idx" ON "media_assets"("isAttached", "deletedAt");
