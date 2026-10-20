import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateSiteDto } from './dto/create-site.dto.js';
import { UpdateSiteDto } from './dto/update-site.dto.js';
import { CreatePageDto } from './dto/create-page.dto.js';
import { UpdatePageDto } from './dto/update-page.dto.js';
import { TemplateSeederService } from './template-seeder.service.js';
import {
  SiteStatus,
  FormSubmissionStatus,
  PageStatus,
  type Prisma,
} from '@prisma/client';
import type { AuthUser } from '../../common/interfaces/auth-user.interface.js';

@Injectable()
export class SitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly templateSeeder: TemplateSeederService,
  ) {}

  async createSite(dto: CreateSiteDto, currentUser?: AuthUser) {
    const existing = await this.prisma.site.findUnique({
      where: { key: dto.key },
    });
    if (existing) {
      throw new ConflictException(`Site with key '${dto.key}' already exists`);
    }

    if (dto.domain) {
      const existingDomain = await this.prisma.site.findUnique({
        where: { domain: dto.domain },
      });
      if (existingDomain) {
        throw new ConflictException(
          `Site with domain '${dto.domain}' already exists`,
        );
      }
    }

    const userId = currentUser?.id ?? null;

    const site = await this.prisma.site.create({
      data: {
        name: dto.name,
        key: dto.key,
        domain: dto.domain ?? null,
        defaultLocale: dto.defaultLocale || 'id',
        timezone: dto.timezone || 'Asia/Jakarta',
        userId,
        status: SiteStatus.ACTIVE,
      },
    });

    // Create SiteMember record for the creator
    if (userId) {
      await this.prisma.siteMember.create({
        data: {
          siteId: site.id,
          userId,
          roleKey: 'cms:site-admin',
        },
      });
    }

    // Provision starter template if requested
    if (dto.templateKey) {
      await this.templateSeeder.seedTemplate(
        site.id,
        dto.templateKey,
        userId || 'system',
      );
    }

    return this.findSiteByKey(site.key);
  }

  async findAllSites(
    query?: { search?: string; status?: SiteStatus },
    currentUser?: AuthUser,
  ) {
    const isSuperAdmin = currentUser?.roles?.includes('ums:admin') ?? false;

    const where: Prisma.SiteWhereInput = {};

    if (query?.status) {
      where.status = query.status;
    }

    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { key: { contains: query.search, mode: 'insensitive' } },
        { domain: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Scoping: non-superadmin only sees sites where they are member
    if (!isSuperAdmin && currentUser?.id) {
      where.members = {
        some: {
          userId: currentUser.id,
        },
      };
    }

    return this.prisma.site.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            pages: true,
            media: true,
            members: true,
            entries: true,
          },
        },
      },
    });
  }

  async findSiteByKey(key: string) {
    const site = await this.prisma.site.findUnique({
      where: { key },
      include: {
        _count: {
          select: {
            pages: true,
            media: true,
            members: true,
            entries: true,
          },
        },
      },
    });

    if (!site) {
      throw new NotFoundException(`Site with key '${key}' not found`);
    }

    return site;
  }

  async updateSite(key: string, dto: UpdateSiteDto) {
    await this.findSiteByKey(key);

    if (dto.domain) {
      const existingDomain = await this.prisma.site.findFirst({
        where: {
          domain: dto.domain,
          NOT: { key },
        },
      });
      if (existingDomain) {
        throw new ConflictException(
          `Domain '${dto.domain}' is already assigned to another site`,
        );
      }
    }

    return this.prisma.site.update({
      where: { key },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.domain !== undefined && { domain: dto.domain || null }),
        ...(dto.status && { status: dto.status }),
        ...(dto.defaultLocale && { defaultLocale: dto.defaultLocale }),
        ...(dto.timezone && { timezone: dto.timezone }),
      },
      include: {
        _count: {
          select: {
            pages: true,
            media: true,
            members: true,
            entries: true,
          },
        },
      },
    });
  }

  async deleteSite(key: string) {
    const site = await this.findSiteByKey(key);

    return this.prisma.site.update({
      where: { key: site.key },
      data: { status: SiteStatus.SUSPENDED },
    });
  }

  async findSitePages(key: string) {
    const site = await this.findSiteByKey(key);
    return this.prisma.page.findMany({
      where: { siteId: site.id },
      orderBy: [{ isHome: 'desc' }, { route: 'asc' }],
    });
  }

  async createSitePage(
    key: string,
    dto: CreatePageDto,
    currentUser?: AuthUser,
  ) {
    const site = await this.findSiteByKey(key);
    const locale = dto.locale || site.defaultLocale || 'id';

    const existing = await this.prisma.page.findUnique({
      where: {
        siteId_route_locale: {
          siteId: site.id,
          route: dto.route,
          locale,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Page with route '${dto.route}' and locale '${locale}' already exists on site '${site.key}'`,
      );
    }

    // If isHome is true, unset other home pages on same site & locale
    if (dto.isHome) {
      await this.prisma.page.updateMany({
        where: { siteId: site.id, locale, isHome: true },
        data: { isHome: false },
      });
    }

    const createdById = currentUser?.id || 'system';
    const pageStatus = dto.status || PageStatus.DRAFT;

    const page = await this.prisma.page.create({
      data: {
        siteId: site.id,
        route: dto.route,
        title: dto.title,
        status: pageStatus,
        isHome: Boolean(dto.isHome),
        blocks: (dto.blocks || []) as unknown as Prisma.InputJsonValue,
        locale,
        createdById,
        publishedAt: pageStatus === PageStatus.PUBLISHED ? new Date() : null,
        metaTitle: dto.metaTitle || dto.title,
        metaDescription: dto.metaDescription,
        canonicalUrl: dto.canonicalUrl,
        ogTitle: dto.ogTitle,
        ogImageAssetId: dto.ogImageAssetId,
        robots: dto.robots || 'index,follow',
      },
      include: {
        revisions: {
          orderBy: { version: 'desc' },
        },
      },
    });

    // Create initial revision
    await this.prisma.pageRevision.create({
      data: {
        pageId: page.id,
        version: 1,
        title: page.title,
        blocks: page.blocks as unknown as Prisma.InputJsonValue,
        createdById,
      },
    });

    return page;
  }

  async findSitePageById(key: string, pageId: string) {
    const site = await this.findSiteByKey(key);
    const page = await this.prisma.page.findFirst({
      where: { id: pageId, siteId: site.id },
      include: {
        revisions: {
          orderBy: { version: 'desc' },
        },
      },
    });

    if (!page) {
      throw new NotFoundException(
        `Page with ID '${pageId}' not found on site '${site.key}'`,
      );
    }

    return page;
  }

  async updateSitePage(
    key: string,
    pageId: string,
    dto: UpdatePageDto,
    currentUser?: AuthUser,
  ) {
    const page = await this.findSitePageById(key, pageId);
    const locale = dto.locale || page.locale;

    if (dto.route && (dto.route !== page.route || locale !== page.locale)) {
      const existing = await this.prisma.page.findUnique({
        where: {
          siteId_route_locale: {
            siteId: page.siteId,
            route: dto.route,
            locale,
          },
        },
      });
      if (existing && existing.id !== page.id) {
        throw new ConflictException(
          `Page with route '${dto.route}' and locale '${locale}' already exists on this site`,
        );
      }
    }

    if (dto.isHome) {
      await this.prisma.page.updateMany({
        where: {
          siteId: page.siteId,
          locale,
          isHome: true,
          id: { not: page.id },
        },
        data: { isHome: false },
      });
    }

    const createdById = currentUser?.id || 'system';

    // Check if new revision needed (when blocks or title changed)
    const blocksChanged =
      dto.blocks !== undefined &&
      JSON.stringify(dto.blocks) !== JSON.stringify(page.blocks);
    const titleChanged = dto.title !== undefined && dto.title !== page.title;

    if (blocksChanged || titleChanged) {
      const latestRev = await this.prisma.pageRevision.findFirst({
        where: { pageId: page.id },
        orderBy: { version: 'desc' },
      });
      const nextVersion = (latestRev?.version || 0) + 1;

      await this.prisma.pageRevision.create({
        data: {
          pageId: page.id,
          version: nextVersion,
          title: dto.title || page.title,
          blocks: (dto.blocks !== undefined
            ? dto.blocks
            : page.blocks) as unknown as Prisma.InputJsonValue,
          createdById,
        },
      });
    }

    const updated = await this.prisma.page.update({
      where: { id: page.id },
      data: {
        ...(dto.route && { route: dto.route }),
        ...(dto.title && { title: dto.title }),
        ...(dto.status && {
          status: dto.status,
          publishedAt:
            dto.status === PageStatus.PUBLISHED
              ? page.publishedAt || new Date()
              : page.publishedAt,
        }),
        ...(dto.isHome !== undefined && { isHome: dto.isHome }),
        ...(dto.blocks !== undefined && {
          blocks: dto.blocks as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.locale && { locale: dto.locale }),
        ...(dto.metaTitle !== undefined && { metaTitle: dto.metaTitle }),
        ...(dto.metaDescription !== undefined && {
          metaDescription: dto.metaDescription,
        }),
        ...(dto.canonicalUrl !== undefined && {
          canonicalUrl: dto.canonicalUrl,
        }),
        ...(dto.ogTitle !== undefined && { ogTitle: dto.ogTitle }),
        ...(dto.ogImageAssetId !== undefined && {
          ogImageAssetId: dto.ogImageAssetId,
        }),
        ...(dto.robots !== undefined && { robots: dto.robots }),
      },
      include: {
        revisions: {
          orderBy: { version: 'desc' },
        },
      },
    });

    return updated;
  }

  async deleteSitePage(key: string, pageId: string) {
    const page = await this.findSitePageById(key, pageId);

    await this.prisma.page.delete({
      where: { id: page.id },
    });

    return {
      success: true,
      message: `Page '${page.route}' deleted successfully`,
    };
  }

  async revertSitePageVersion(
    key: string,
    pageId: string,
    version: number,
    currentUser?: AuthUser,
  ) {
    const page = await this.findSitePageById(key, pageId);

    const revision = await this.prisma.pageRevision.findUnique({
      where: {
        pageId_version: {
          pageId: page.id,
          version,
        },
      },
    });

    if (!revision) {
      throw new NotFoundException(
        `Revision version ${version} for page '${page.id}' not found`,
      );
    }

    return this.updateSitePage(
      key,
      page.id,
      {
        title: revision.title,
        blocks: revision.blocks as unknown as Record<string, unknown>[],
      },
      currentUser,
    );
  }

  async findSiteMedia(key: string) {
    const site = await this.findSiteByKey(key);
    return this.prisma.mediaAsset.findMany({
      where: { siteId: site.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findSiteMembers(key: string) {
    const site = await this.findSiteByKey(key);
    return this.prisma.siteMember.findMany({
      where: { siteId: site.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findSiteSubmissions(
    key: string,
    query?: {
      formKey?: string;
      status?: FormSubmissionStatus;
      page?: number;
      limit?: number;
    },
  ) {
    const site = await this.findSiteByKey(key);
    const page = query?.page && query.page > 0 ? query.page : 1;
    const limit = query?.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.FormSubmissionWhereInput = {
      siteId: site.id,
    };

    if (query?.formKey) {
      where.formKey = query.formKey;
    }

    if (query?.status) {
      where.status = query.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.formSubmission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.formSubmission.count({ where }),
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

  async updateSubmissionStatus(
    key: string,
    submissionId: string,
    status: FormSubmissionStatus,
  ) {
    const site = await this.findSiteByKey(key);

    const submission = await this.prisma.formSubmission.findFirst({
      where: { id: submissionId, siteId: site.id },
    });

    if (!submission) {
      throw new NotFoundException(
        `Form submission with ID '${submissionId}' not found on site '${site.key}'`,
      );
    }

    return this.prisma.formSubmission.update({
      where: { id: submissionId },
      data: {
        status,
        isSpam: status === FormSubmissionStatus.SPAM,
      },
    });
  }
}
