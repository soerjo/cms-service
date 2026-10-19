import { Controller, Get, Headers, Param, Query, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { DeliveryService } from './delivery.service.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { Response } from 'express';

@ApiTags('delivery')
@Public()
@Controller(['delivery/v1', 's/:siteKey/delivery/v1'])
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  private extractSiteKey(
    pathSiteKey?: string,
    querySiteKey?: string,
    headerSiteKey?: string,
  ): string {
    return pathSiteKey || querySiteKey || headerSiteKey || 'default';
  }

  @Get('content')
  @ApiOperation({ summary: 'Public list of published content entries' })
  @ApiQuery({ name: 'siteKey', required: false })
  @ApiQuery({ name: 'contentType', required: false })
  @ApiQuery({ name: 'locale', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'tag', required: false })
  @ApiQuery({ name: 'slug', required: false })
  getPublishedContent(
    @Param('siteKey') pathSiteKey?: string,
    @Query('siteKey') querySiteKey?: string,
    @Headers('x-site-key') headerSiteKey?: string,
    @Query('contentType') contentType?: string,
    @Query('locale') locale?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('tag') tag?: string,
    @Query('slug') slug?: string,
  ) {
    const siteKey = this.extractSiteKey(
      pathSiteKey,
      querySiteKey,
      headerSiteKey,
    );
    return this.deliveryService.findPublishedContent({
      siteKey,
      contentType,
      locale,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      tag,
      slug,
    });
  }

  @Get('content/:slug')
  @ApiOperation({ summary: 'Get published content entry by slug' })
  @ApiQuery({ name: 'siteKey', required: false })
  @ApiQuery({ name: 'contentType', required: false })
  @ApiQuery({ name: 'locale', required: false })
  getPublishedBySlug(
    @Param('slug') slug: string,
    @Param('siteKey') pathSiteKey?: string,
    @Query('siteKey') querySiteKey?: string,
    @Headers('x-site-key') headerSiteKey?: string,
    @Query('contentType') contentType?: string,
    @Query('locale') locale?: string,
  ) {
    const siteKey = this.extractSiteKey(
      pathSiteKey,
      querySiteKey,
      headerSiteKey,
    );
    return this.deliveryService.findPublishedBySlug(
      slug,
      contentType,
      locale,
      siteKey,
    );
  }

  @Get('pages')
  @ApiOperation({ summary: 'List all published pages for a site' })
  @ApiQuery({ name: 'siteKey', required: false })
  @ApiQuery({ name: 'locale', required: false })
  getPublishedPages(
    @Param('siteKey') pathSiteKey?: string,
    @Query('siteKey') querySiteKey?: string,
    @Headers('x-site-key') headerSiteKey?: string,
    @Query('locale') locale?: string,
  ) {
    const siteKey = this.extractSiteKey(
      pathSiteKey,
      querySiteKey,
      headerSiteKey,
    );
    return this.deliveryService.findPublishedPages(siteKey, locale);
  }

  @Get('pages/*route')
  @ApiOperation({ summary: 'Get published page by route' })
  @ApiQuery({ name: 'siteKey', required: false })
  @ApiQuery({ name: 'locale', required: false })
  getPublishedPageByRoute(
    @Param('route') routeParam: string,
    @Param('siteKey') pathSiteKey?: string,
    @Query('siteKey') querySiteKey?: string,
    @Headers('x-site-key') headerSiteKey?: string,
    @Query('locale') locale?: string,
  ) {
    const siteKey = this.extractSiteKey(
      pathSiteKey,
      querySiteKey,
      headerSiteKey,
    );
    const normalizedRoute = routeParam.startsWith('/')
      ? routeParam
      : `/${routeParam}`;
    return this.deliveryService.findPublishedPageByRoute(
      normalizedRoute,
      siteKey,
      locale,
    );
  }

  @Get('categories')
  @ApiOperation({ summary: 'List all categories for a site' })
  @ApiQuery({ name: 'siteKey', required: false })
  getCategories(
    @Param('siteKey') pathSiteKey?: string,
    @Query('siteKey') querySiteKey?: string,
    @Headers('x-site-key') headerSiteKey?: string,
  ) {
    const siteKey = this.extractSiteKey(
      pathSiteKey,
      querySiteKey,
      headerSiteKey,
    );
    return this.deliveryService.getCategories(siteKey);
  }

  @Get('tags')
  @ApiOperation({ summary: 'List all tags for a site' })
  @ApiQuery({ name: 'siteKey', required: false })
  getTags(
    @Param('siteKey') pathSiteKey?: string,
    @Query('siteKey') querySiteKey?: string,
    @Headers('x-site-key') headerSiteKey?: string,
  ) {
    const siteKey = this.extractSiteKey(
      pathSiteKey,
      querySiteKey,
      headerSiteKey,
    );
    return this.deliveryService.getTags(siteKey);
  }

  @Get('media/*storageKey')
  @ApiOperation({ summary: 'Stream media file by storageKey' })
  @ApiExcludeEndpoint()
  async getMedia(
    @Param('storageKey') storageKey: string,
    @Res() res: Response,
  ) {
    return this.deliveryService.streamMedia(storageKey, res);
  }
}
