import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateContentEntryDto } from './dto/create-content-entry.dto.js';
import { ContentStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { DEFAULT_SITE_ID } from '../../common/constants/site.constants.js';

@Injectable()
export class ContentRepository {
  constructor(private prisma: PrismaService) {}

  async create(
    dto: CreateContentEntryDto,
    createdById: string,
    contentTypeId: string,
    siteId: string = DEFAULT_SITE_ID,
  ) {
    return this.prisma.contentEntry.create({
      data: {
        siteId,
        contentTypeId,
        slug: dto.slug,
        data: dto.data,
        locale: dto.locale || 'id',
        status: ContentStatus.DRAFT,
        createdById,
      },
      include: {
        contentType: true,
        tags: { include: { tag: true } },
      },
    });
  }

  async findAll(query: {
    contentTypeId?: string;
    status?: ContentStatus;
    locale?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ContentEntryWhereInput = {};
    if (query.contentTypeId) where.contentTypeId = query.contentTypeId;
    if (query.status) where.status = query.status;
    if (query.locale) where.locale = query.locale;

    const [items, total] = await Promise.all([
      this.prisma.contentEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
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

  async findById(id: string) {
    const entry = await this.prisma.contentEntry.findUnique({
      where: { id },
      include: {
        contentType: true,
        tags: { include: { tag: true } },
        versions: { orderBy: { version: 'desc' } },
      },
    });
    if (!entry) {
      throw new NotFoundException(`Content entry with ID ${id} not found`);
    }
    return entry;
  }

  async update(
    id: string,
    data: Record<string, any>,
    newVersionNumber?: number,
    userId?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.contentEntry.update({
        where: { id },
        data: {
          data: data,
        },
        include: {
          contentType: true,
          tags: { include: { tag: true } },
        },
      });

      if (newVersionNumber && userId) {
        await tx.contentVersion.create({
          data: {
            entryId: id,
            version: newVersionNumber,
            data: data,
            createdById: userId,
          },
        });
      }

      return updated;
    });
  }

  async updateStatus(id: string, status: ContentStatus, userId?: string) {
    const updateData: Prisma.ContentEntryUpdateInput = { status };
    if (status === ContentStatus.PUBLISHED) {
      updateData.publishedAt = new Date();
      updateData.publishedById = userId;
    }
    return this.prisma.contentEntry.update({
      where: { id },
      data: updateData,
      include: {
        contentType: true,
        tags: { include: { tag: true } },
      },
    });
  }

  async schedulePublish(id: string, scheduledAt: Date, userId: string) {
    return this.prisma.contentEntry.update({
      where: { id },
      data: {
        status: ContentStatus.SCHEDULED,
        scheduledPublishAt: scheduledAt,
        publishedById: userId,
      },
      include: {
        contentType: true,
        tags: { include: { tag: true } },
      },
    });
  }

  async cancelScheduledPublish(id: string) {
    return this.prisma.contentEntry.update({
      where: { id },
      data: {
        status: ContentStatus.DRAFT,
        scheduledPublishAt: null,
      },
      include: {
        contentType: true,
        tags: { include: { tag: true } },
      },
    });
  }

  async getVersions(entryId: string) {
    await this.findById(entryId);
    return this.prisma.contentVersion.findMany({
      where: { entryId },
      orderBy: { version: 'desc' },
    });
  }

  async getVersionByNumber(entryId: string, versionNumber: number) {
    await this.findById(entryId);
    const version = await this.prisma.contentVersion.findUnique({
      where: {
        entryId_version: {
          entryId,
          version: versionNumber,
        },
      },
    });
    if (!version) {
      throw new NotFoundException(
        `Version ${versionNumber} for entry ${entryId} not found`,
      );
    }
    return version;
  }

  async getLatestVersionNumber(entryId: string): Promise<number> {
    const latest = await this.prisma.contentVersion.findFirst({
      where: { entryId },
      orderBy: { version: 'desc' },
    });
    return latest ? latest.version : 0;
  }

  async delete(id: string) {
    await this.findById(id);
    return this.prisma.contentEntry.delete({
      where: { id },
    });
  }

  async setTags(entryId: string, tagIds: string[]) {
    await this.findById(entryId);
    await this.prisma.contentTag.deleteMany({ where: { entryId } });
    if (tagIds && tagIds.length > 0) {
      await this.prisma.contentTag.createMany({
        data: tagIds.map((tagId) => ({ entryId, tagId })),
      });
    }
    return this.findById(entryId);
  }
}
