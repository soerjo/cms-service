import { Module } from '@nestjs/common';
import { ContentTypesController } from './content-types.controller.js';
import { ContentTypesService } from './content-types.service.js';
import { ContentTypesRepository } from './content-types.repository.js';
import { DefaultContentTypesSeeder } from './default-content-types.seeder.js';

@Module({
  controllers: [ContentTypesController],
  providers: [
    ContentTypesService,
    ContentTypesRepository,
    DefaultContentTypesSeeder,
  ],
  exports: [
    ContentTypesService,
    ContentTypesRepository,
    DefaultContentTypesSeeder,
  ],
})
export class ContentTypesModule {}
