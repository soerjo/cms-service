import { MediaCleanupService } from './media-cleanup.service.js';
import type { MediaRepository } from './media.repository.js';
import type { HttpFileServiceTokenProvider } from './file-service.client.js';
import type { ConfigService } from '@nestjs/config';

describe('MediaCleanupService', () => {
  let service: MediaCleanupService;
  let repo: {
    findUnattachedForSoftDelete: jest.Mock;
    softDelete: jest.Mock;
    findSoftDeletedForHardDelete: jest.Mock;
    delete: jest.Mock;
  };
  let tokenProvider: {
    fetchWithAuth: jest.Mock;
  };
  let configService: {
    get: jest.Mock;
  };

  beforeEach(() => {
    repo = {
      findUnattachedForSoftDelete: jest.fn().mockResolvedValue([
        { id: 'm-1', fileId: 'f-1', isAttached: false },
        { id: 'm-2', fileId: 'f-2', isAttached: false },
      ]),
      softDelete: jest
        .fn()
        .mockImplementation((id: string) =>
          Promise.resolve({ id, deletedAt: new Date() }),
        ),
      findSoftDeletedForHardDelete: jest
        .fn()
        .mockResolvedValue([
          { id: 'm-expired-1', fileId: 'f-expired-1', deletedAt: new Date() },
        ]),
      delete: jest
        .fn()
        .mockImplementation((id: string) => Promise.resolve({ id })),
    };

    tokenProvider = {
      fetchWithAuth: jest.fn().mockResolvedValue({ ok: true, status: 200 }),
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'FILE_SERVICE_URL') return 'http://file-service:3100/api';
        return null;
      }),
    };

    service = new MediaCleanupService(
      repo as unknown as MediaRepository,
      tokenProvider as unknown as HttpFileServiceTokenProvider,
      configService as unknown as ConfigService,
    );
  });

  it('soft-deletes unattached media older than 7 days', async () => {
    const count = await service.cleanupUnattachedMedia(7);
    expect(count).toBe(2);
    expect(repo.softDelete).toHaveBeenCalledTimes(2);
    expect(repo.softDelete).toHaveBeenCalledWith('m-1');
    expect(repo.softDelete).toHaveBeenCalledWith('m-2');
  });

  it('hard-deletes expired media from MinIO file service and database', async () => {
    const count = await service.purgeExpiredMedia(30);
    expect(count).toBe(1);
    expect(tokenProvider.fetchWithAuth).toHaveBeenCalledTimes(1);
    expect(tokenProvider.fetchWithAuth).toHaveBeenCalledWith(
      'http://file-service:3100/api/files/f-expired-1',
      { method: 'DELETE' },
    );
    expect(repo.delete).toHaveBeenCalledTimes(1);
    expect(repo.delete).toHaveBeenCalledWith('m-expired-1');
  });
});
