import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DEFAULT_SITE_ID } from '../../common/constants/site.constants.js';

@Injectable()
export class MediaRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    siteId?: string;
    fileId: string;
    objectKey: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    altText?: string;
    uploadedById: string;
  }) {
    const { siteId = DEFAULT_SITE_ID, ...rest } = data;
    return this.prisma.mediaAsset.create({
      data: {
        siteId,
        ...rest,
      },
    });
  }

  async findAll(skip?: number, take?: number) {
    return this.prisma.mediaAsset.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const item = await this.prisma.mediaAsset.findUnique({
      where: { id },
    });
    if (!item) {
      throw new NotFoundException(`MediaAsset with ID ${id} not found`);
    }
    return item;
  }

  async findByObjectKey(objectKey: string) {
    return this.prisma.mediaAsset.findUnique({
      where: { objectKey },
    });
  }

  async delete(id: string) {
    const item = await this.findById(id);
    await this.prisma.mediaAsset.delete({
      where: { id },
    });
    return item;
  }
}
