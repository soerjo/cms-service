import { Module } from '@nestjs/common';
import { SitesController } from './sites.controller.js';
import { SitesService } from './sites.service.js';
import { TemplateSeederService } from './template-seeder.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [SitesController],
  providers: [SitesService, TemplateSeederService],
  exports: [SitesService, TemplateSeederService],
})
export class SitesModule {}
