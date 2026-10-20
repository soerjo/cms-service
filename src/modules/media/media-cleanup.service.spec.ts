import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { MediaCleanupService } from './media-cleanup.service.js';
import { MediaRepository } from './media.repository.js';
import { HttpFileServiceTokenProvider } from './file-service.client.js';
import { ConfigService } from '@nestjs/config';

describe('MediaCleanupService', () => {
  let service: MediaCleanupService;
  let repo: any;
  let tokenProvider: any;
  let configService: any;

  beforeEach(() => {
    repo = {
      findUnattachedForSoftDelete: mock(async () => [
        { id: 'm-1', fileId: 'f-1', isAttached: false },
        { id: 'm-2', fileId: 'f-2', isAttached: false },
      ]),
      softDelete: mock(async (id: string) => ({ id, deletedAt: new Date() })),
      findSoftDeletedForHardDelete: mock(async () => [
        { id: 'm-expired-1', fileId: 'f-expired-1', deletedAt: new Date() },
      ]),
      delete: mock(async (id: string) => ({ id })),
    };

    tokenProvider = {
      fetchWithAuth: mock(async () => ({ ok: true, status: 200 })),
    };

    configService = {
      get: mock((key: string) => {
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
