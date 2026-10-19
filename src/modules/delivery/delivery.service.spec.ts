import { Test, type TestingModule } from '@nestjs/testing';
import { DeliveryService } from './delivery.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CategoriesRepository } from '../categories/categories.repository.js';
import { TagsRepository } from '../tags/tags.repository.js';
import { MediaService } from '../media/media.service.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ContentStatus, PageStatus, SiteStatus } from '@prisma/client';

describe('DeliveryService (Multi-Site Scoping)', () => {
  let service: DeliveryService;

  const mockSite = {
    id: 'site-uuid-1',
    key: 'toko-kopi',
    name: 'Toko Kopi',
    status: SiteStatus.ACTIVE,
  };

  const mockSuspendedSite = {
    id: 'site-uuid-2',
    key: 'suspended-site',
    name: 'Suspended Site',
    status: SiteStatus.SUSPENDED,
  };

  const mockPrisma = {
    site: {
      findUnique: jest.fn(),
    },
    contentEntry: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    contentType: {
      findUnique: jest.fn(),
    },
    page: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    formSubmission: {
      create: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
    tag: {
      findMany: jest.fn(),
    },
  };

  const mockCategoriesRepo = {
    findAll: jest.fn(),
  };

  const mockTagsRepo = {
    findAll: jest.fn(),
  };

  const mockMediaService = {
    getPresignedUrlByObjectKey: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CategoriesRepository, useValue: mockCategoriesRepo },
        { provide: TagsRepository, useValue: mockTagsRepo },
        { provide: MediaService, useValue: mockMediaService },
      ],
    }).compile();

    service = module.get<DeliveryService>(DeliveryService);
  });

  describe('resolveSite', () => {
    it('throws NotFoundException if site does not exist', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(null);

      await expect(service.resolveSite('unknown-site')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.site.findUnique).toHaveBeenCalledWith({
        where: { key: 'unknown-site' },
      });
    });

    it('throws ForbiddenException if site is SUSPENDED', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(mockSuspendedSite);

      await expect(service.resolveSite('suspended-site')).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrisma.site.findUnique).toHaveBeenCalledWith({
        where: { key: 'suspended-site' },
      });
    });

    it('returns site if site is ACTIVE', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(mockSite);

      const site = await service.resolveSite('toko-kopi');
      expect(site).toEqual(mockSite);
      expect(mockPrisma.site.findUnique).toHaveBeenCalledWith({
        where: { key: 'toko-kopi' },
      });
    });

    it('defaults to siteKey "default" when siteKey is omitted or empty', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(mockSite);

      await service.resolveSite('');
      expect(mockPrisma.site.findUnique).toHaveBeenCalledWith({
        where: { key: 'default' },
      });
    });
  });

  describe('findPublishedContent scoping', () => {
    it('scopes query strictly to siteId and published status', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(mockSite);
      mockPrisma.contentEntry.findMany.mockResolvedValue([]);
      mockPrisma.contentEntry.count.mockResolvedValue(0);

      const result = await service.findPublishedContent({
        siteKey: 'toko-kopi',
        locale: 'id',
      });

      expect(result.items).toEqual([]);
      expect(mockPrisma.contentEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            siteId: 'site-uuid-1',
            status: ContentStatus.PUBLISHED,
            locale: 'id',
          },
        }),
      );
    });
  });

  describe('findPublishedBySlug scoping', () => {
    it('scopes findFirst to siteId and slug', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(mockSite);
      const mockEntry = {
        id: 'entry-1',
        slug: 'tentang-kami',
        siteId: 'site-uuid-1',
        status: ContentStatus.PUBLISHED,
      };
      mockPrisma.contentEntry.findFirst.mockResolvedValue(mockEntry);

      const result = await service.findPublishedBySlug(
        'tentang-kami',
        undefined,
        'id',
        'toko-kopi',
      );

      expect(result).toEqual(mockEntry);
      expect(mockPrisma.contentEntry.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            siteId: 'site-uuid-1',
            slug: 'tentang-kami',
            status: ContentStatus.PUBLISHED,
            locale: 'id',
          },
        }),
      );
    });

    it('throws NotFoundException if slug not found on site', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(mockSite);
      mockPrisma.contentEntry.findFirst.mockResolvedValue(null);

      await expect(
        service.findPublishedBySlug('not-exist', undefined, 'id', 'toko-kopi'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findPublishedPages scoping', () => {
    it('retrieves published pages filtered by siteId', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(mockSite);
      const mockPages = [
        {
          id: 'page-1',
          route: '/',
          title: 'Beranda',
          status: PageStatus.PUBLISHED,
        },
      ];
      mockPrisma.page.findMany.mockResolvedValue(mockPages);

      const pages = await service.findPublishedPages('toko-kopi', 'id');
      expect(pages).toEqual(mockPages);
      expect(mockPrisma.page.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            siteId: 'site-uuid-1',
            status: PageStatus.PUBLISHED,
            locale: 'id',
          },
        }),
      );
    });
  });

  describe('submitForm', () => {
    it('creates a form submission record scoped to site', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(mockSite);
      mockPrisma.formSubmission.create.mockResolvedValue({
        id: 'sub-1',
        siteId: 'site-uuid-1',
        formKey: 'contact',
        status: 'PENDING',
      });

      const result = await service.submitForm(
        'toko-kopi',
        'contact',
        { name: 'Budi', message: 'Tanya produk' },
        { ip: '127.0.0.1', userAgent: 'Mozilla/5.0' },
      );

      expect(result.success).toBe(true);
      expect(result.submissionId).toBe('sub-1');
      expect(mockPrisma.formSubmission.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          siteId: 'site-uuid-1',
          formKey: 'contact',
          payload: { name: 'Budi', message: 'Tanya produk' },
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
        }) as unknown,
      });
    });

    it('rejects form submission if site is suspended', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(mockSuspendedSite);

      await expect(
        service.submitForm(
          'suspended-site',
          'contact',
          { message: 'halo' },
          {},
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('SEO generator (sitemap & robots)', () => {
    it('generates valid sitemap XML including pages and content', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(mockSite);
      mockPrisma.page.findMany.mockResolvedValue([
        {
          route: '/',
          isHome: true,
          updatedAt: new Date('2026-10-19T00:00:00Z'),
          publishedAt: new Date('2026-10-19T00:00:00Z'),
        },
      ]);
      mockPrisma.contentEntry.findMany.mockResolvedValue([
        {
          slug: 'promo-kopi',
          updatedAt: new Date('2026-10-19T00:00:00Z'),
          publishedAt: new Date('2026-10-19T00:00:00Z'),
        },
      ]);

      const xml = await service.generateSitemapXml(
        'toko-kopi',
        'https://tokokopi.id',
      );

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain(
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      );
      expect(xml).toContain('<loc>https://tokokopi.id/</loc>');
      expect(xml).toContain('<priority>1.0</priority>');
      expect(xml).toContain(
        '<loc>https://tokokopi.id/content/promo-kopi</loc>',
      );
      expect(xml).toContain('<priority>0.6</priority>');
    });

    it('generates valid robots.txt with sitemap reference', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(mockSite);

      const robots = await service.generateRobotsTxt(
        'toko-kopi',
        'https://tokokopi.id',
      );

      expect(robots).toContain('User-agent: *');
      expect(robots).toContain('Allow: /');
      expect(robots).toContain('Sitemap: https://tokokopi.id/sitemap.xml');
    });
  });
});
