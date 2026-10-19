import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { ContentService } from './content.service.js';
import { CreateContentEntryDto } from './dto/create-content-entry.dto.js';
import { PublishScheduleDto } from './dto/publish-schedule.dto.js';
import { UpdateContentEntryDto } from './dto/update-content-entry.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../../common/interfaces/auth-user.interface.js';
import { ContentStatus } from '@prisma/client';

@ApiTags('content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles('ums:admin')
@Controller(['content/entries', 'content'])
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new content entry (DRAFT)' })
  create(@Body() dto: CreateContentEntryDto, @CurrentUser() user: AuthUser) {
    return this.contentService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List content entries with optional filters' })
  @ApiQuery({ name: 'contentTypeId', required: false })
  @ApiQuery({ name: 'status', enum: ContentStatus, required: false })
  @ApiQuery({ name: 'locale', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('contentTypeId') contentTypeId?: string,
    @Query('status') status?: ContentStatus,
    @Query('locale') locale?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.contentService.findAll({
      contentTypeId,
      status,
      locale,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get content entry by ID' })
  findById(@Param('id') id: string) {
    return this.contentService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update content entry data (creates new version)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContentEntryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.contentService.update(id, dto, user.id);
  }

  @Post(':id/publish')
  @ApiOperation({
    summary:
      'Publish content entry (or schedule it when scheduledAt is in the future)',
  })
  publish(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto?: PublishScheduleDto,
  ) {
    return this.contentService.publish(id, user.id, {
      scheduledAt: dto?.scheduledAt ? new Date(dto.scheduledAt) : undefined,
    });
  }

  @Post(':id/publish/cancel')
  @ApiOperation({ summary: 'Cancel a scheduled publish (revert to DRAFT)' })
  cancelSchedule(@Param('id') id: string) {
    return this.contentService.cancelSchedule(id);
  }

  @Post(':id/unpublish')
  @ApiOperation({ summary: 'Unpublish content entry (revert to DRAFT)' })
  unpublish(@Param('id') id: string) {
    return this.contentService.unpublish(id);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive content entry' })
  archive(@Param('id') id: string) {
    return this.contentService.archive(id);
  }

  @Get([':id/versions', ':id/revisions'])
  @ApiOperation({ summary: 'List all versions/revisions of a content entry' })
  getVersions(@Param('id') id: string) {
    return this.contentService.getVersions(id);
  }

  @Get([':id/versions/:version', ':id/revisions/:version'])
  @ApiOperation({ summary: 'Get specific version/revision of a content entry' })
  getVersionByNumber(
    @Param('id') id: string,
    @Param('version', ParseIntPipe) version: number,
  ) {
    return this.contentService.getVersionByNumber(id, version);
  }

  @Post([':id/versions/:version/restore', ':id/revert/:version'])
  @ApiOperation({
    summary: 'Restore/revert a specific version as a new draft version',
  })
  restoreVersion(
    @Param('id') id: string,
    @Param('version', ParseIntPipe) version: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.contentService.restoreVersion(id, version, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete content entry' })
  remove(@Param('id') id: string) {
    return this.contentService.remove(id);
  }
}
