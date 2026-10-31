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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ContentService } from './content.service.js';
import { CreateContentEntryDto } from './dto/create-content-entry.dto.js';
import { PublishScheduleDto } from './dto/publish-schedule.dto.js';
import { UpdateContentEntryDto } from './dto/update-content-entry.dto.js';
import { QueryContentDto } from './dto/query-content.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../../common/interfaces/auth-user.interface.js';

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
  findAll(@Query() query: QueryContentDto) {
    return this.contentService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get content entry by ID' })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update content entry data' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContentEntryDto,
  ) {
    return this.contentService.update(id, dto);
  }

  @Post(':id/publish')
  @ApiOperation({
    summary:
      'Publish content entry (or schedule it when scheduledAt is in the future)',
  })
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto?: PublishScheduleDto,
  ) {
    return this.contentService.publish(id, user.id, {
      scheduledAt: dto?.scheduledAt ? new Date(dto.scheduledAt) : undefined,
    });
  }

  @Post(':id/publish/cancel')
  @ApiOperation({ summary: 'Cancel a scheduled publish (revert to DRAFT)' })
  cancelSchedule(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.cancelSchedule(id);
  }

  @Post(':id/unpublish')
  @ApiOperation({ summary: 'Unpublish content entry (revert to DRAFT)' })
  unpublish(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.unpublish(id);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive content entry' })
  archive(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.archive(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete content entry' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.remove(id);
  }
}
