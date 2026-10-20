import { Test, type TestingModule } from '@nestjs/testing';
import { SitesController } from './sites.controller.js';
import { SitesService } from './sites.service.js';
import { SiteStatus } from '@prisma/client';
import type { AuthUser } from '../../common/interfaces/auth-user.interface.js';

describe('SitesController', () => {
  let controller: SitesController;

  const mockSite = {
    id: 'site-1',
    name: 'Resto Enak',
    key: 'resto-enak',
    status: SiteStatus.ACTIVE,
  };

  const adminUser: AuthUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    roles: ['ums:admin'],
  };

  const mockSitesService = {
    createSite: jest.fn(),
    findAllSites: jest.fn(),
    findSiteByKey: jest.fn(),
    updateSite: jest.fn(),
    deleteSite: jest.fn(),
    findSitePages: jest.fn(),
    findSiteMedia: jest.fn(),
    findSiteMembers: jest.fn(),
    findSiteSubmissions: jest.fn(),
    updateSubmissionStatus: jest.fn(),
    createSitePage: jest.fn(),
    findSitePageById: jest.fn(),
    updateSitePage: jest.fn(),
    deleteSitePage: jest.fn(),
    revertSitePageVersion: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SitesController],
      providers: [
        {
          provide: SitesService,
          useValue: mockSitesService,
        },
      ],
    }).compile();

    controller = module.get<SitesController>(SitesController);
  });

  it('delegates createSite to service', async () => {
    mockSitesService.createSite.mockResolvedValue(mockSite);

    const dto = { name: 'Resto Enak', key: 'resto-enak' };
    const result = await controller.createSite(dto, adminUser);

    expect(result).toEqual(mockSite);
    expect(mockSitesService.createSite).toHaveBeenCalledWith(dto, adminUser);
  });

  it('delegates findAllSites to service', async () => {
    mockSitesService.findAllSites.mockResolvedValue([mockSite]);

    const result = await controller.findAllSites(
      'resto',
      SiteStatus.ACTIVE,
      adminUser,
    );
    expect(result).toEqual([mockSite]);
    expect(mockSitesService.findAllSites).toHaveBeenCalledWith(
      { search: 'resto', status: SiteStatus.ACTIVE },
      adminUser,
    );
  });

  it('delegates findSiteByKey to service', async () => {
    mockSitesService.findSiteByKey.mockResolvedValue(mockSite);

    const result = await controller.findSiteByKey('resto-enak');
    expect(result).toEqual(mockSite);
    expect(mockSitesService.findSiteByKey).toHaveBeenCalledWith('resto-enak');
  });

  it('delegates updateSite to service', async () => {
    mockSitesService.updateSite.mockResolvedValue(mockSite);

    const dto = { name: 'Baru' };
    const result = await controller.updateSite('resto-enak', dto);
    expect(result).toEqual(mockSite);
    expect(mockSitesService.updateSite).toHaveBeenCalledWith('resto-enak', dto);
  });

  it('delegates deleteSite to service', async () => {
    mockSitesService.deleteSite.mockResolvedValue(mockSite);

    const result = await controller.deleteSite('resto-enak');
    expect(result).toEqual(mockSite);
    expect(mockSitesService.deleteSite).toHaveBeenCalledWith('resto-enak');
  });

  it('delegates sub-resources listing', async () => {
    mockSitesService.findSitePages.mockResolvedValue([]);
    mockSitesService.findSiteMedia.mockResolvedValue([]);
    mockSitesService.findSiteMembers.mockResolvedValue([]);

    await controller.findSitePages('resto-enak');
    expect(mockSitesService.findSitePages).toHaveBeenCalledWith('resto-enak');

    await controller.findSiteMedia('resto-enak');
    expect(mockSitesService.findSiteMedia).toHaveBeenCalledWith('resto-enak');

    await controller.findSiteMembers('resto-enak');
    expect(mockSitesService.findSiteMembers).toHaveBeenCalledWith('resto-enak');

    mockSitesService.findSiteSubmissions.mockResolvedValue({
      items: [],
      meta: {},
    });
    await controller.findSiteSubmissions('resto-enak');
    expect(mockSitesService.findSiteSubmissions).toHaveBeenCalledWith(
      'resto-enak',
      expect.any(Object),
    );

    mockSitesService.updateSubmissionStatus.mockResolvedValue({
      id: 'sub-1',
      status: 'PROCESSED',
    });
    await controller.updateSubmissionStatus('resto-enak', 'sub-1', {
      status: 'PROCESSED',
    });
    expect(mockSitesService.updateSubmissionStatus).toHaveBeenCalledWith(
      'resto-enak',
      'sub-1',
      'PROCESSED',
    );

    mockSitesService.createSitePage.mockResolvedValue({ id: 'page-1' });
    await controller.createSitePage(
      'resto-enak',
      { route: '/menu', title: 'Menu' },
      adminUser,
    );
    expect(mockSitesService.createSitePage).toHaveBeenCalledWith(
      'resto-enak',
      { route: '/menu', title: 'Menu' },
      adminUser,
    );

    mockSitesService.findSitePageById.mockResolvedValue({ id: 'page-1' });
    await controller.findSitePageById('resto-enak', 'page-1');
    expect(mockSitesService.findSitePageById).toHaveBeenCalledWith(
      'resto-enak',
      'page-1',
    );

    mockSitesService.updateSitePage.mockResolvedValue({
      id: 'page-1',
      title: 'Menu Baru',
    });
    await controller.updateSitePage(
      'resto-enak',
      'page-1',
      { title: 'Menu Baru' },
      adminUser,
    );
    expect(mockSitesService.updateSitePage).toHaveBeenCalledWith(
      'resto-enak',
      'page-1',
      { title: 'Menu Baru' },
      adminUser,
    );

    mockSitesService.deleteSitePage.mockResolvedValue({ success: true });
    await controller.deleteSitePage('resto-enak', 'page-1');
    expect(mockSitesService.deleteSitePage).toHaveBeenCalledWith(
      'resto-enak',
      'page-1',
    );

    mockSitesService.revertSitePageVersion.mockResolvedValue({ id: 'page-1' });
    await controller.revertSitePageVersion(
      'resto-enak',
      'page-1',
      1,
      adminUser,
    );
    expect(mockSitesService.revertSitePageVersion).toHaveBeenCalledWith(
      'resto-enak',
      'page-1',
      1,
      adminUser,
    );
  });
});
