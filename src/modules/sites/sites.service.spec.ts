import { Test, type TestingModule } from '@nestjs/testing';
import { SitesService } from './sites.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TemplateSeederService } from './template-seeder.service.js';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SiteStatus } from '@prisma/client';
import type { AuthUser } from '../../common/interfaces/auth-user.interface.js';

describe('SitesService', () => {
  let service: SitesService;

  const mockSite = {
    id: 'site-1',
    name: 'Resto Enak',
    key: 'resto-enak',
    domain: 'restoenak.com',
    status: SiteStatus.ACTIVE,
    defaultLocale: 'id',
    timezone: 'Asia/Jakarta',
  };

  const adminUser: AuthUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    roles: ['ums:admin'],
  };

  const normalUser: AuthUser = {
    id: 'user-1',
    email: 'user@example.com',
    roles: ['cms:editor'],
  };

  const mockPrisma = {
    site: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    siteMember: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    page: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    pageRevision: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    mediaAsset: {
      findMany: jest.fn(),
    },
    formSubmission: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockTemplateSeeder = {
    seedTemplate: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SitesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TemplateSeederService, useValue: mockTemplateSeeder },
      ],
    }).compile();

    service = module.get<SitesService>(SitesService);
  });

  describe('createSite', () => {
    it('creates site and assigns creator as site-admin', async () => {
      mockPrisma.site.create.mockResolvedValue(mockSite);
      // findUnique calls: 1. key check, 2. domain check, 3. findSiteByKey after creation
      mockPrisma.site.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValue(mockSite);

      const result: unknown = await service.createSite(
        {
          name: 'Resto Enak',
          key: 'resto-enak',
          domain: 'restoenak.com',
          templateKey: 'resto-web-profile',
        },
        normalUser,
      );

      expect(mockPrisma.site.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Resto Enak',
          key: 'resto-enak',
          userId: 'user-1',
        }) as unknown,
      });

      expect(mockPrisma.siteMember.create).toHaveBeenCalledWith({
        data: {
          siteId: 'site-1',
          userId: 'user-1',
          roleKey: 'cms:site-admin',
        },
      });

      expect(mockTemplateSeeder.seedTemplate).toHaveBeenCalledWith(
        'site-1',
        'resto-web-profile',
        'user-1',
      );

      expect(result).toEqual(mockSite);
    });

    it('throws ConflictException if site key already exists', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(mockSite);

      await expect(
        service.createSite({ name: 'Resto Enak', key: 'resto-enak' }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException if site domain already exists', async () => {
      mockPrisma.site.findUnique
        .mockResolvedValueOnce(null) // key check passes
        .mockResolvedValueOnce({ id: 'site-2', domain: 'restoenak.com' }); // domain check fails

      await expect(
        service.createSite({
          name: 'Resto Enak',
          key: 'resto-enak',
          domain: 'restoenak.com',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAllSites', () => {
    it('returns all sites for ums:admin', async () => {
      mockPrisma.site.findMany.mockResolvedValue([mockSite]);

      const sites = await service.findAllSites({}, adminUser);
      expect(sites).toEqual([mockSite]);
      expect(mockPrisma.site.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });

    it('filters sites by membership for non-superadmin', async () => {
      mockPrisma.site.findMany.mockResolvedValue([mockSite]);

      const sites = await service.findAllSites({}, normalUser);
      expect(sites).toEqual([mockSite]);
      expect(mockPrisma.site.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            members: {
              some: { userId: 'user-1' },
            },
          },
        }),
      );
    });
  });

  describe('findSiteByKey', () => {
    it('returns site details if found', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(mockSite);

      const site = await service.findSiteByKey('resto-enak');
      expect(site).toEqual(mockSite);
    });

    it('throws NotFoundException if site not found', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(null);

      await expect(service.findSiteByKey('non-exist')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateSite', () => {
    it('updates site fields', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(mockSite);
      mockPrisma.site.update.mockResolvedValue({
        ...mockSite,
        name: 'Resto Update',
      });

      const updated = await service.updateSite('resto-enak', {
        name: 'Resto Update',
      });
      expect(updated.name).toBe('Resto Update');
    });
  });

  describe('deleteSite', () => {
    it('sets site status to SUSPENDED', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(mockSite);
      mockPrisma.site.update.mockResolvedValue({
        ...mockSite,
        status: SiteStatus.SUSPENDED,
      });

      const result = await service.deleteSite('resto-enak');
      expect(result.status).toBe(SiteStatus.SUSPENDED);
      expect(mockPrisma.site.update).toHaveBeenCalledWith({
        where: { key: 'resto-enak' },
        data: { status: SiteStatus.SUSPENDED },
      });
    });
  });

  describe('sub-resources', () => {
    it('findSitePages returns pages for site', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(mockSite);
      mockPrisma.page.findMany.mockResolvedValue([{ id: 'page-1' }]);

      const pages = await service.findSitePages('resto-enak');
      expect(pages).toEqual([{ id: 'page-1' }]);
    });

    it('findSiteSubmissions returns paginated submissions', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(mockSite);
      mockPrisma.formSubmission.findMany.mockResolvedValue([
        { id: 'sub-1', formKey: 'contact', status: 'PENDING' },
      ]);
      mockPrisma.formSubmission.count.mockResolvedValue(1);

      const result = await service.findSiteSubmissions('resto-enak');
      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('updateSubmissionStatus updates status and spam flag', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(mockSite);
      mockPrisma.formSubmission.findFirst.mockResolvedValue({
        id: 'sub-1',
        siteId: 'site-1',
        status: 'PENDING',
      });
      mockPrisma.formSubmission.update.mockResolvedValue({
        id: 'sub-1',
        status: 'SPAM',
        isSpam: true,
      });

      const updated = await service.updateSubmissionStatus(
        'resto-enak',
        'sub-1',
        'SPAM',
      );
      expect(updated.status).toBe('SPAM');
      expect(mockPrisma.formSubmission.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { status: 'SPAM', isSpam: true },
      });
    });

    it('createSitePage creates page and revision', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(mockSite);
      mockPrisma.page.findUnique.mockResolvedValue(null);
      mockPrisma.page.create.mockResolvedValue({
        id: 'page-1',
        siteId: 'site-1',
        route: '/about',
        title: 'Tentang Kami',
        status: 'DRAFT',
      });
      mockPrisma.pageRevision.create.mockResolvedValue({ id: 'rev-1' });

      const page = await service.createSitePage('resto-enak', {
        route: '/about',
        title: 'Tentang Kami',
        blocks: [{ type: 'hero' }],
      });

      expect(page.id).toBe('page-1');
      expect(mockPrisma.page.create).toHaveBeenCalled();
      expect(mockPrisma.pageRevision.create).toHaveBeenCalled();
    });

    it('updateSitePage updates page and adds new revision if blocks changed', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(mockSite);
      mockPrisma.page.findFirst.mockResolvedValue({
        id: 'page-1',
        siteId: 'site-1',
        route: '/about',
        title: 'Tentang Kami',
        blocks: [{ type: 'hero' }],
        locale: 'id',
      });
      mockPrisma.pageRevision.findFirst.mockResolvedValue({ version: 1 });
      mockPrisma.page.update.mockResolvedValue({
        id: 'page-1',
        title: 'Tentang Resto',
      });

      const updated = await service.updateSitePage('resto-enak', 'page-1', {
        title: 'Tentang Resto',
        blocks: [{ type: 'hero', props: { new: true } }],
      });

      expect(updated.title).toBe('Tentang Resto');
      expect(mockPrisma.pageRevision.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          version: 2,
          title: 'Tentang Resto',
        }) as unknown,
      });
    });

    it('deleteSitePage deletes page', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(mockSite);
      mockPrisma.page.findFirst.mockResolvedValue({
        id: 'page-1',
        route: '/about',
      });
      mockPrisma.page.delete.mockResolvedValue({ id: 'page-1' });

      const res = await service.deleteSitePage('resto-enak', 'page-1');
      expect(res.success).toBe(true);
      expect(mockPrisma.page.delete).toHaveBeenCalledWith({
        where: { id: 'page-1' },
      });
    });
  });
});
