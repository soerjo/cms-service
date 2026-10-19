import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CategoriesRepository } from '../categories/categories.repository.js';
import { TagsRepository } from '../tags/tags.repository.js';
import { MediaService } from '../media/media.service.js';
import {
  ContentStatus,
  PageStatus,
  SiteStatus,
  FormSubmissionStatus,
  type Site,
} from '@prisma/client';
import type { Prisma } from '@prisma/client';
import type { Response } from 'express';

@Injectable()
export class DeliveryService {
  constructor(
    private prisma: PrismaService,
    private categoriesRepo: CategoriesRepository,
    private tagsRepo: TagsRepository,
    private mediaService: MediaService,
  ) {}

  async resolveSite(siteKey?: string): Promise<Site> {
    const key =
      siteKey && siteKey.trim().length > 0 ? siteKey.trim() : 'default';
    const site = await this.prisma.site.findUnique({ where: { key } });

    if (!site) {
      throw new NotFoundException(`Site '${key}' not found`);
    }

    if (site.status === SiteStatus.SUSPENDED) {
      throw new ForbiddenException(`Site '${key}' is suspended`);
    }

    return site;
  }

  async findPublishedContent(query: {
    siteKey?: string;
    contentType?: string;
    locale?: string;
    page?: number;
    limit?: number;
    tag?: string;
    slug?: string;
  }) {
    const site = await this.resolveSite(query.siteKey);
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ContentEntryWhereInput = {
      siteId: site.id,
      status: ContentStatus.PUBLISHED,
    };

    if (query.locale) {
      where.locale = query.locale;
    }

    if (query.slug) {
      where.slug = query.slug;
    }

    if (query.contentType) {
      const ct = await this.prisma.contentType.findUnique({
        where: { key: query.contentType },
      });
      if (ct) {
        where.contentTypeId = ct.id;
      } else {
        where.contentTypeId = 'non-existent';
      }
    }

    if (query.tag) {
      where.tags = {
        some: {
          tag: {
            OR: [{ id: query.tag }, { key: query.tag }],
          },
        },
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.contentEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: {
          contentType: true,
          tags: { include: { tag: true } },
        },
      }),
      this.prisma.contentEntry.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findPublishedBySlug(
    slug: string,
    contentTypeKey?: string,
    locale?: string,
    siteKey?: string,
  ) {
    const site = await this.resolveSite(siteKey);

    const where: Prisma.ContentEntryWhereInput = {
      siteId: site.id,
      slug,
      status: ContentStatus.PUBLISHED,
      locale: locale || 'id',
    };

    if (contentTypeKey) {
      const ct = await this.prisma.contentType.findUnique({
        where: { key: contentTypeKey },
      });
      if (ct) {
        where.contentTypeId = ct.id;
      }
    }

    const entry = await this.prisma.contentEntry.findFirst({
      where,
      include: {
        contentType: true,
        tags: { include: { tag: true } },
      },
    });

    if (!entry) {
      throw new NotFoundException(
        `Published entry with slug ${slug} not found on site '${site.key}'`,
      );
    }

    return entry;
  }

  async findPublishedPages(siteKey?: string, locale?: string) {
    const site = await this.resolveSite(siteKey);

    return this.prisma.page.findMany({
      where: {
        siteId: site.id,
        status: PageStatus.PUBLISHED,
        locale: locale || 'id',
      },
      select: {
        id: true,
        route: true,
        title: true,
        isHome: true,
        blocks: true,
        metaTitle: true,
        metaDescription: true,
        canonicalUrl: true,
        ogTitle: true,
        ogImageAssetId: true,
        robots: true,
        publishedAt: true,
      },
      orderBy: { isHome: 'desc' },
    });
  }

  async findPublishedPageByRoute(
    route: string,
    siteKey?: string,
    locale?: string,
  ) {
    const site = await this.resolveSite(siteKey);

    const page = await this.prisma.page.findFirst({
      where: {
        siteId: site.id,
        route,
        status: PageStatus.PUBLISHED,
        locale: locale || 'id',
      },
      select: {
        id: true,
        route: true,
        title: true,
        isHome: true,
        blocks: true,
        metaTitle: true,
        metaDescription: true,
        canonicalUrl: true,
        ogTitle: true,
        ogImageAssetId: true,
        robots: true,
        publishedAt: true,
      },
    });

    if (!page) {
      throw new NotFoundException(
        `Published page with route '${route}' not found on site '${site.key}'`,
      );
    }

    return page;
  }

  async getCategories(siteKey?: string) {
    const site = await this.resolveSite(siteKey);
    return this.prisma.category.findMany({
      where: { siteId: site.id },
      include: { children: true },
    });
  }

  async getTags(siteKey?: string) {
    const site = await this.resolveSite(siteKey);
    return this.prisma.tag.findMany({
      where: { siteId: site.id },
    });
  }

  async submitForm(
    siteKey: string,
    formKey: string,
    payload: Record<string, unknown>,
    meta: { ip?: string; userAgent?: string },
  ) {
    const site = await this.resolveSite(siteKey);

    const submission = await this.prisma.formSubmission.create({
      data: {
        siteId: site.id,
        formKey: formKey || 'contact',
        payload: payload as Prisma.InputJsonValue,
        status: FormSubmissionStatus.PENDING,
        ipAddress: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      },
    });

    return {
      success: true,
      submissionId: submission.id,
      message: 'Form submitted successfully',
    };
  }

  async generateSitemapXml(
    siteKey: string,
    baseUrlOverride?: string,
  ): Promise<string> {
    const site = await this.resolveSite(siteKey);

    const host =
      baseUrlOverride ||
      (site.domain
        ? `https://${site.domain}`
        : `https://${site.key}.cms.local`);
    const cleanHost = host.replace(/\/+$/, '');

    const [pages, entries] = await Promise.all([
      this.prisma.page.findMany({
        where: { siteId: site.id, status: PageStatus.PUBLISHED },
        select: {
          route: true,
          isHome: true,
          updatedAt: true,
          publishedAt: true,
        },
      }),
      this.prisma.contentEntry.findMany({
        where: { siteId: site.id, status: ContentStatus.PUBLISHED },
        select: { slug: true, updatedAt: true, publishedAt: true },
      }),
    ]);

    const urlEntries: string[] = [];

    for (const page of pages) {
      const pagePath = page.route.startsWith('/')
        ? page.route
        : `/${page.route}`;
      const loc = `${cleanHost}${pagePath}`;
      const modDate = (page.updatedAt || page.publishedAt || new Date())
        .toISOString()
        .split('T')[0];
      const priority = page.isHome ? '1.0' : '0.8';

      urlEntries.push(`  <url>
    <loc>${loc}</loc>
    <lastmod>${modDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`);
    }

    for (const entry of entries) {
      const loc = `${cleanHost}/content/${entry.slug}`;
      const modDate = (entry.updatedAt || entry.publishedAt || new Date())
        .toISOString()
        .split('T')[0];

      urlEntries.push(`  <url>
    <loc>${loc}</loc>
    <lastmod>${modDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join('\n')}
</urlset>`;
  }

  async generateRobotsTxt(
    siteKey: string,
    baseUrlOverride?: string,
  ): Promise<string> {
    const site = await this.resolveSite(siteKey);

    const host =
      baseUrlOverride ||
      (site.domain
        ? `https://${site.domain}`
        : `https://${site.key}.cms.local`);
    const cleanHost = host.replace(/\/+$/, '');

    return `User-agent: *
Allow: /

Sitemap: ${cleanHost}/sitemap.xml
`;
  }

  async streamMedia(objectKey: string, res: Response) {
    const decodedKey = decodeURIComponent(objectKey);
    const presignedUrl =
      await this.mediaService.getPresignedUrlByObjectKey(decodedKey);
    if (!presignedUrl) {
      throw new NotFoundException(
        `Media with objectKey ${decodedKey} not found`,
      );
    }
    res.redirect(302, presignedUrl);
  }
}
