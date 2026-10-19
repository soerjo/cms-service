-- CreateEnum
CREATE TYPE "SiteStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TRIAL_EXPIRED');

-- CreateEnum
CREATE TYPE "PageStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "sites" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "status" "SiteStatus" NOT NULL DEFAULT 'ACTIVE',
    "plan" TEXT,
    "locale" TEXT,
    "defaultLocale" TEXT NOT NULL DEFAULT 'id',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- Insert Default Site for legacy data migration
INSERT INTO "sites" ("id", "key", "name", "status", "defaultLocale", "timezone", "updatedAt")
VALUES ('default-site-id', 'default', 'Default Site', 'ACTIVE', 'id', 'Asia/Jakarta', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_members" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_locales" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "site_locales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pages" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "PageStatus" NOT NULL DEFAULT 'DRAFT',
    "isHome" BOOLEAN NOT NULL DEFAULT false,
    "blocks" JSONB NOT NULL DEFAULT '[]',
    "locale" TEXT NOT NULL DEFAULT 'id',
    "scheduledPublishAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "canonicalUrl" TEXT,
    "ogTitle" TEXT,
    "ogImageAssetId" TEXT,
    "robots" TEXT DEFAULT 'index,follow',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_revisions" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "blocks" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "block_templates" (
    "id" TEXT NOT NULL,
    "siteId" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schema" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "block_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_submissions" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "formKey" TEXT NOT NULL DEFAULT 'contact',
    "payload" JSONB NOT NULL,
    "isSpam" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);

-- AlterTable ContentType
ALTER TABLE "content_types" ADD COLUMN IF NOT EXISTS "isSystem" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "content_types" ADD COLUMN IF NOT EXISTS "siteId" TEXT;

-- AlterTable ContentEntry
ALTER TABLE "content_entries" ADD COLUMN IF NOT EXISTS "siteId" TEXT NOT NULL DEFAULT 'default-site-id';
ALTER TABLE "content_entries" ADD COLUMN IF NOT EXISTS "pendingReviewAt" TIMESTAMP(3);
ALTER TABLE "content_entries" ADD COLUMN IF NOT EXISTS "reviewerById" TEXT;

-- AlterTable Category
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "siteId" TEXT NOT NULL DEFAULT 'default-site-id';
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_key_key";

-- AlterTable Tag
ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "siteId" TEXT NOT NULL DEFAULT 'default-site-id';
ALTER TABLE "tags" DROP CONSTRAINT IF EXISTS "tags_key_key";

-- AlterTable MediaAsset
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "siteId" TEXT NOT NULL DEFAULT 'default-site-id';
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "focalPoint" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "sites_key_key" ON "sites"("key");
CREATE UNIQUE INDEX "sites_domain_key" ON "sites"("domain");
CREATE UNIQUE INDEX "site_settings_siteId_key_key" ON "site_settings"("siteId", "key");
CREATE INDEX "site_members_userId_idx" ON "site_members"("userId");
CREATE UNIQUE INDEX "site_members_siteId_userId_key" ON "site_members"("siteId", "userId");
CREATE UNIQUE INDEX "site_locales_siteId_code_key" ON "site_locales"("siteId", "code");
CREATE INDEX "pages_siteId_status_locale_idx" ON "pages"("siteId", "status", "locale");
CREATE INDEX "pages_siteId_isHome_idx" ON "pages"("siteId", "isHome");
CREATE UNIQUE INDEX "pages_siteId_route_locale_key" ON "pages"("siteId", "route", "locale");
CREATE UNIQUE INDEX "page_revisions_pageId_version_key" ON "page_revisions"("pageId", "version");
CREATE UNIQUE INDEX "block_templates_siteId_key_key" ON "block_templates"("siteId", "key");
CREATE INDEX "form_submissions_siteId_createdAt_idx" ON "form_submissions"("siteId", "createdAt");

-- Update ContentEntry indexes
DROP INDEX IF EXISTS "content_entries_contentTypeId_slug_locale_key";
CREATE UNIQUE INDEX "content_entries_siteId_contentTypeId_slug_locale_key" ON "content_entries"("siteId", "contentTypeId", "slug", "locale");
CREATE INDEX "content_entries_siteId_contentTypeId_locale_status_idx" ON "content_entries"("siteId", "contentTypeId", "locale", "status");
CREATE INDEX "content_entries_siteId_status_idx" ON "content_entries"("siteId", "status");

-- Update Category & Tag & Media indexes
CREATE UNIQUE INDEX "categories_siteId_key_key" ON "categories"("siteId", "key");
CREATE UNIQUE INDEX "tags_siteId_key_key" ON "tags"("siteId", "key");
CREATE INDEX "media_assets_siteId_createdAt_idx" ON "media_assets"("siteId", "createdAt");

-- AddForeignKey
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "site_members" ADD CONSTRAINT "site_members_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "site_locales" ADD CONSTRAINT "site_locales_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pages" ADD CONSTRAINT "pages_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "page_revisions" ADD CONSTRAINT "page_revisions_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "block_templates" ADD CONSTRAINT "block_templates_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_types" ADD CONSTRAINT "content_types_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_entries" ADD CONSTRAINT "content_entries_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "categories" ADD CONSTRAINT "categories_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tags" ADD CONSTRAINT "tags_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
