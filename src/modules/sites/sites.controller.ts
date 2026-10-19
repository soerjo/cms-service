import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SitesService } from './sites.service.js';
import { CreateSiteDto } from './dto/create-site.dto.js';
import { UpdateSiteDto } from './dto/update-site.dto.js';
import { UpdateSubmissionStatusDto } from './dto/update-submission-status.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../../common/interfaces/auth-user.interface.js';
import { SiteStatus, FormSubmissionStatus } from '@prisma/client';

@ApiTags('sites')
@ApiBearerAuth()
@Controller('cms/sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create new CMS site with optional starter template',
  })
  async createSite(@Body() dto: CreateSiteDto, @CurrentUser() user: AuthUser) {
    return this.sitesService.createSite(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List all CMS sites accessible to current user' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: SiteStatus })
  async findAllSites(
    @Query('search') search?: string,
    @Query('status') status?: SiteStatus,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.sitesService.findAllSites({ search, status }, user);
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get site details by key' })
  async findSiteByKey(@Param('key') key: string) {
    return this.sitesService.findSiteByKey(key);
  }

  @Patch(':key')
  @ApiOperation({ summary: 'Update site details' })
  async updateSite(@Param('key') key: string, @Body() dto: UpdateSiteDto) {
    return this.sitesService.updateSite(key, dto);
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Suspend / delete site' })
  async deleteSite(@Param('key') key: string) {
    return this.sitesService.deleteSite(key);
  }

  @Get(':key/pages')
  @ApiOperation({ summary: 'List all pages for a site' })
  async findSitePages(@Param('key') key: string) {
    return this.sitesService.findSitePages(key);
  }

  @Get(':key/media')
  @ApiOperation({ summary: 'List all media assets for a site' })
  async findSiteMedia(@Param('key') key: string) {
    return this.sitesService.findSiteMedia(key);
  }

  @Get(':key/members')
  @ApiOperation({ summary: 'List all members for a site' })
  async findSiteMembers(@Param('key') key: string) {
    return this.sitesService.findSiteMembers(key);
  }

  @Get(':key/submissions')
  @ApiOperation({ summary: 'List all form submissions for a site' })
  @ApiQuery({ name: 'formKey', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: FormSubmissionStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findSiteSubmissions(
    @Param('key') key: string,
    @Query('formKey') formKey?: string,
    @Query('status') status?: FormSubmissionStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.sitesService.findSiteSubmissions(key, {
      formKey,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Patch(':key/submissions/:id')
  @ApiOperation({ summary: 'Update form submission status' })
  async updateSubmissionStatus(
    @Param('key') key: string,
    @Param('id') id: string,
    @Body() dto: UpdateSubmissionStatusDto,
  ) {
    return this.sitesService.updateSubmissionStatus(key, id, dto.status);
  }
}
