import { Injectable } from '@nestjs/common';
import { ContentRepository } from './content.repository.js';
import { ContentTypesRepository } from '../content-types/content-types.repository.js';
import { CreateContentEntryDto } from './dto/create-content-entry.dto.js';
import {
  UpdateContentEntryDto,
  UpdateContentTagsDto,
} from './dto/update-content-entry.dto.js';
import { validateContentData } from './content-validation.util.js';
import { ContentStatus } from '@prisma/client';
import { MediaRepository } from '../media/media.repository.js';
import { extractMediaReferences } from '../media/media-extractor.util.js';

@Injectable()
export class ContentService {
  constructor(
    private contentRepo: ContentRepository,
    private contentTypesRepo: ContentTypesRepository,
    private mediaRepo: MediaRepository,
  ) {}

  private async resolveContentType(contentTypeIdOrKey: string) {
    // Try finding by id first, if fails try find by key
    try {
      return await this.contentTypesRepo.findById(contentTypeIdOrKey);
    } catch {
      return await this.contentTypesRepo.findByKey(contentTypeIdOrKey);
    }
  }

  async create(dto: CreateContentEntryDto, userId: string) {
    const contentType = await this.resolveContentType(dto.contentTypeId);

    // Validate data against field defs
    validateContentData(
      contentType.fields as unknown as import('./content-validation.util.js').FieldDefinition[],
      dto.data,
    );

    const entry = await this.contentRepo.create(dto, userId, contentType.id);

    // Create initial version 1
    const latestVer = await this.contentRepo.getLatestVersionNumber(entry.id);
    await this.contentRepo.update(entry.id, dto.data, latestVer + 1, userId);

    // Verify & attach media references used in entry data
    const mediaRefs = extractMediaReferences(dto.data);
    if (mediaRefs.length > 0) {
      await this.mediaRepo.markAttached(mediaRefs, entry.id);
    }

    return this.contentRepo.findById(entry.id);
  }

  async findAll(query: {
    contentTypeId?: string;
    status?: ContentStatus;
    locale?: string;
    page?: number;
    limit?: number;
  }) {
    let resolvedContentTypeId = query.contentTypeId;
    if (resolvedContentTypeId) {
      try {
        const ct = await this.resolveContentType(resolvedContentTypeId);
        resolvedContentTypeId = ct.id;
      } catch {
        // if not found, use query as-is
      }
    }
    return this.contentRepo.findAll({
      ...query,
      contentTypeId: resolvedContentTypeId,
    });
  }

  async findById(id: string) {
    return this.contentRepo.findById(id);
  }

  async update(id: string, dto: UpdateContentEntryDto, userId: string) {
    const existing = await this.contentRepo.findById(id);
    const contentType = await this.contentTypesRepo.findById(
      existing.contentTypeId,
    );

    const mergedData = dto.data
      ? { ...(existing.data as Record<string, unknown>), ...dto.data }
      : (existing.data as Record<string, unknown>);

    if (dto.data) {
      validateContentData(
        contentType.fields as unknown as import('./content-validation.util.js').FieldDefinition[],
        mergedData,
      );
    }

    const latestVer = await this.contentRepo.getLatestVersionNumber(id);
    const updated = await this.contentRepo.update(
      id,
      mergedData,
      latestVer + 1,
      userId,
    );

    // Verify & attach media references used in updated entry data
    const mediaRefs = extractMediaReferences(mergedData);
    if (mediaRefs.length > 0) {
      await this.mediaRepo.markAttached(mediaRefs, id);
    }

    return updated;
  }

  async publish(id: string, userId: string, opts?: { scheduledAt?: Date }) {
    await this.contentRepo.findById(id);
    const scheduledAt = opts?.scheduledAt;
    if (scheduledAt && scheduledAt.getTime() > Date.now()) {
      // Future date -> SCHEDULED; scheduler will flip to PUBLISHED when due.
      return this.contentRepo.schedulePublish(id, scheduledAt, userId);
    }
    return this.contentRepo.updateStatus(id, ContentStatus.PUBLISHED, userId);
  }

  async cancelSchedule(id: string) {
    await this.contentRepo.findById(id);
    return this.contentRepo.cancelScheduledPublish(id);
  }

  async unpublish(id: string) {
    await this.contentRepo.findById(id);
    return this.contentRepo.updateStatus(id, ContentStatus.DRAFT);
  }

  async archive(id: string) {
    await this.contentRepo.findById(id);
    return this.contentRepo.updateStatus(id, ContentStatus.ARCHIVED);
  }

  async getVersions(id: string) {
    return this.contentRepo.getVersions(id);
  }

  async getVersionByNumber(id: string, versionNumber: number) {
    return this.contentRepo.getVersionByNumber(id, versionNumber);
  }

  async restoreVersion(id: string, versionNumber: number, userId: string) {
    const version = await this.contentRepo.getVersionByNumber(
      id,
      versionNumber,
    );
    const existing = await this.contentRepo.findById(id);
    const contentType = await this.contentTypesRepo.findById(
      existing.contentTypeId,
    );

    validateContentData(
      contentType.fields as unknown as import('./content-validation.util.js').FieldDefinition[],
      version.data,
    );

    const latestVer = await this.contentRepo.getLatestVersionNumber(id);
    return this.contentRepo.update(
      id,
      version.data as Record<string, unknown>,
      latestVer + 1,
      userId,
    );
  }

  async setTags(id: string, dto: UpdateContentTagsDto) {
    return this.contentRepo.setTags(id, dto.tagIds);
  }

  async remove(id: string) {
    return this.contentRepo.delete(id);
  }
}
