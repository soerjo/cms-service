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
