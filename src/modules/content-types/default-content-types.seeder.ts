import {
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ContentTypesRepository } from './content-types.repository.js';
import { DEFAULT_CONTENT_TYPES } from './default-content-types.data.js';

export interface SeedResult {
  created: string[];
  skipped: string[];
  failed: string[];
}

@Injectable()
export class DefaultContentTypesSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(DefaultContentTypesSeeder.name);

  constructor(private readonly repo: ContentTypesRepository) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seed();
  }

  /**
   * Idempotent: creates only the default content types whose `key` does not
   * exist yet. Failures are logged per type and never abort startup.
   */
  async seed(): Promise<SeedResult> {
    const result: SeedResult = { created: [], skipped: [], failed: [] };

    for (const ct of DEFAULT_CONTENT_TYPES) {
      try {
        if (await this.exists(ct.key)) {
          this.logger.log(`ContentType '${ct.key}' already exists, skipping`);
          result.skipped.push(ct.key);
          continue;
        }

        await this.repo.create(ct);
        this.logger.log(`Seeded ContentType '${ct.key}'`);
        result.created.push(ct.key);
      } catch (error: unknown) {
        const code =
          typeof error === 'object' && error !== null && 'code' in error
            ? error.code
            : undefined;
        if (code === 'P2002') {
          // Another instance seeded the same key concurrently.
          this.logger.log(`ContentType '${ct.key}' already exists, skipping`);
          result.skipped.push(ct.key);
          continue;
        }
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to seed ContentType '${ct.key}': ${message}`);
        result.failed.push(ct.key);
      }
    }

    return result;
  }

  private async exists(key: string): Promise<boolean> {
    try {
      await this.repo.findByKey(key);
      return true;
    } catch (error) {
      if (error instanceof NotFoundException) {
        return false;
      }
      throw error;
    }
  }
}
