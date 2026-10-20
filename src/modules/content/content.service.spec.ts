import { Test, TestingModule } from '@nestjs/testing';
import { ContentService } from './content.service.js';
import { ContentRepository } from './content.repository.js';
import { ContentTypesRepository } from '../content-types/content-types.repository.js';
import { MediaRepository } from '../media/media.repository.js';
import { NotFoundException } from '@nestjs/common';

describe('ContentService (Delete & Remove)', () => {
  let service: ContentService;
  let contentRepo: jest.Mocked<ContentRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        {
          provide: ContentRepository,
          useValue: {
            delete: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: ContentTypesRepository,
          useValue: {},
        },
        {
          provide: MediaRepository,
          useValue: {
            markAttached: jest.fn().mockResolvedValue({ count: 1 }),
          },
        },
      ],
    }).compile();

    service = module.get<ContentService>(ContentService);
    contentRepo = module.get(ContentRepository);
  });

  it('should remove an entry successfully', async () => {
    contentRepo.delete.mockResolvedValue({ id: 'entry-1' } as any);
    const result = await service.remove('entry-1');
    expect(result).toEqual({ id: 'entry-1' });
    expect(contentRepo.delete.mock.calls[0]?.[0]).toBe('entry-1');
  });

  it('should throw NotFoundException when removing non-existent entry', async () => {
    contentRepo.delete.mockRejectedValue(new NotFoundException('Not found'));
    await expect(service.remove('invalid-id')).rejects.toThrow(
      NotFoundException,
    );
  });
});
