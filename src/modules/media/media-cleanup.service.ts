import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MediaRepository } from './media.repository.js';
import { HttpFileServiceTokenProvider } from './file-service.client.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MediaCleanupService {
  private readonly logger = new Logger(MediaCleanupService.name);

  constructor(
    private readonly repo: MediaRepository,
    private readonly tokenProvider: HttpFileServiceTokenProvider,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Daily Cron at Midnight:
   * 1. Soft-delete unattached media older than 7 days.
   * 2. Hard-delete soft-deleted media older than 30 days (purges MinIO & DB record).
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleMediaTtlCleanup() {
    this.logger.log('Starting daily media TTL cleanup job...');
    const softDeletedCount = await this.cleanupUnattachedMedia(7);
    const hardDeletedCount = await this.purgeExpiredMedia(30);

    this.logger.log(
      `Media TTL cleanup completed: ${softDeletedCount} soft-deleted, ${hardDeletedCount} hard-deleted.`,
    );
  }

  /**
   * Soft-delete media that has remained unattached for more than N days.
   */
  async cleanupUnattachedMedia(daysThreshold = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);

    const candidates = await this.repo.findUnattachedForSoftDelete(cutoffDate);
    let count = 0;

    for (const asset of candidates) {
      try {
        await this.repo.softDelete(asset.id);
        count++;
      } catch (err) {
        this.logger.warn(`Failed to soft-delete unattached media ${asset.id}: ${err}`);
      }
    }

    if (count > 0) {
      this.logger.log(`Soft-deleted ${count} unattached media assets older than ${daysThreshold} days.`);
    }
    return count;
  }

  /**
   * Hard-delete media that has been soft-deleted for more than N days.
   * Purges upstream in MinIO / file-service, then removes DB row.
   */
  async purgeExpiredMedia(daysThreshold = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);

    const candidates = await this.repo.findSoftDeletedForHardDelete(cutoffDate);
    const fileServiceUrl = this.configService.get<string>('FILE_SERVICE_URL');
    let count = 0;

    for (const asset of candidates) {
      try {
        // 1. Delete physical object in MinIO upstream
        if (fileServiceUrl && asset.fileId) {
          const deleteEndpoint = `${fileServiceUrl.replace(/\/$/, '')}/files/${asset.fileId}`;
          try {
            const response = await this.tokenProvider.fetchWithAuth(deleteEndpoint, {
              method: 'DELETE',
            });
            if (response.status !== 404 && !response.ok) {
              this.logger.warn(
                `Upstream MinIO delete returned status ${response.status} for fileId ${asset.fileId}`,
              );
            }
          } catch (err) {
            this.logger.warn(`Failed calling MinIO delete for fileId ${asset.fileId}: ${err}`);
          }
        }

        // 2. Hard-delete row in database
        await this.repo.delete(asset.id);
        count++;
      } catch (err) {
        this.logger.warn(`Failed to hard-delete media ${asset.id}: ${err}`);
      }
    }

    if (count > 0) {
      this.logger.log(`Hard-deleted ${count} expired media assets from MinIO & database.`);
    }
    return count;
  }
}
