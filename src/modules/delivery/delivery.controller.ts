import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiExcludeEndpoint,
  ApiBody,
} from '@nestjs/swagger';
import { DeliveryService } from './delivery.service.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { Request, Response } from 'express';

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
  @Header(
    'Cache-Control',
    'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
  )
  @ApiOperation({ summary: 'Public list of published content entries' })
  @ApiQuery({ name: 'siteKey', required: false })
  @ApiQuery({ name: 'contentType', required: false })
  @ApiQuery({ name: 'locale', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'tag', required: false })
  @ApiQuery({ name: 'slug', required: false })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Case-insensitive search across slug and JSONB content data',
  })
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
    @Query('search') search?: string,
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
      search,
    });
  }

  @Get('content/:slug')
  @Header(
    'Cache-Control',
    'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
  )
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

  @Get('categories')
  @Header(
    'Cache-Control',
    'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
  )
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
  @Header(
    'Cache-Control',
    'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
  )
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

  @Post(['forms/:formKey/submissions', 'forms/submit'])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit public form data for a site' })
  @ApiQuery({ name: 'siteKey', required: false })
  @ApiBody({
    description: 'Arbitrary form submission payload',
    schema: { type: 'object' },
  })
  async submitForm(
    @Body() payload: Record<string, unknown>,
    @Req() req: Request,
    @Param('formKey') pathFormKey?: string,
    @Param('siteKey') pathSiteKey?: string,
    @Query('siteKey') querySiteKey?: string,
    @Headers('x-site-key') headerSiteKey?: string,
  ) {
    const siteKey = this.extractSiteKey(
      pathSiteKey,
      querySiteKey,
      headerSiteKey,
    );
    const formKey = pathFormKey || 'contact';
    const ip =
      req.ip || (req.headers['x-forwarded-for'] as string) || undefined;
    const userAgent = req.get('user-agent') || undefined;

    return this.deliveryService.submitForm(siteKey, formKey, payload, {
      ip,
      userAgent,
    });
  }

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml')
  @Header(
    'Cache-Control',
    'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
  )
  @ApiOperation({ summary: 'Dynamic XML sitemap for a site' })
  @ApiQuery({ name: 'siteKey', required: false })
  async getSitemap(
    @Req() req: Request,
    @Param('siteKey') pathSiteKey?: string,
    @Query('siteKey') querySiteKey?: string,
    @Headers('x-site-key') headerSiteKey?: string,
  ) {
    const siteKey = this.extractSiteKey(
      pathSiteKey,
      querySiteKey,
      headerSiteKey,
    );
    const protocol = req.protocol || 'https';
    const host = req.get('host');
    const baseUrl = host ? `${protocol}://${host}` : undefined;

    return this.deliveryService.generateSitemapXml(siteKey, baseUrl);
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain')
  @Header(
    'Cache-Control',
    'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
  )
  @ApiOperation({ summary: 'Dynamic robots.txt for a site' })
  @ApiQuery({ name: 'siteKey', required: false })
  async getRobots(
    @Req() req: Request,
    @Param('siteKey') pathSiteKey?: string,
    @Query('siteKey') querySiteKey?: string,
    @Headers('x-site-key') headerSiteKey?: string,
  ) {
    const siteKey = this.extractSiteKey(
      pathSiteKey,
      querySiteKey,
      headerSiteKey,
    );
    const protocol = req.protocol || 'https';
    const host = req.get('host');
    const baseUrl = host ? `${protocol}://${host}` : undefined;

    return this.deliveryService.generateRobotsTxt(siteKey, baseUrl);
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
