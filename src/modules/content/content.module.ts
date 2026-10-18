import { Module } from '@nestjs/common';
import { ContentController } from './content.controller.js';
import { ContentService } from './content.service.js';
import { ContentRepository } from './content.repository.js';
import { ScheduledPublishService } from './scheduled-publish.service.js';
import { ContentTypesModule } from '../content-types/content-types.module.js';

@Module({
  imports: [ContentTypesModule],
  controllers: [ContentController],
  providers: [ContentService, ContentRepository, ScheduledPublishService],
  exports: [ContentService, ContentRepository],
})
export class ContentModule {}
