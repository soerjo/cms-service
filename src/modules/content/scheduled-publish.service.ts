import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ContentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * Publishes content entries whose scheduledPublishAt has passed.
 * Runs every minute via @nestjs/schedule cron. Publishing is done in the
 * same semantics as manual publish: status -> PUBLISHED, publishedAt set
 * to the actual publish time, publishedById preserved from the actor who
 * requested the schedule (or null for system-triggered publish).
 */
@Injectable()
export class ScheduledPublishService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScheduledPublishService.name);

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    this.logger.log('ScheduledPublishService initialized (cron every minute)');
  }

  onModuleDestroy(): void {
    // Nothing to dispose — cron lifecycle handled by ScheduleModule.
  }

  @Cron('* * * * *')
  async publishDueEntries(): Promise<void> {
    const now = new Date();
    try {
      const due = await this.prisma.contentEntry.findMany({
        where: {
          status: ContentStatus.SCHEDULED,
          scheduledPublishAt: { not: null, lte: now },
        },
        select: { id: true, publishedById: true },
        take: 100,
      });
      if (due.length === 0) return;

      await this.prisma.$transaction(
        due.map((entry) =>
          this.prisma.contentEntry.update({
            where: { id: entry.id },
            data: {
              status: ContentStatus.PUBLISHED,
              publishedAt: now,
              publishedById: entry.publishedById,
            } as Prisma.ContentEntryUpdateInput,
          }),
        ),
      );

      this.logger.log(
        `Scheduled publish: ${due.length} entr(ies) published at ${now.toISOString()}`,
      );
    } catch (err) {
      this.logger.error(
        `Scheduled publish sweep failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }
}
