import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateSiteDto } from './dto/create-site.dto.js';
import { UpdateSiteDto } from './dto/update-site.dto.js';
import { TemplateSeederService } from './template-seeder.service.js';
import { SiteStatus, type Prisma } from '@prisma/client';
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
}
