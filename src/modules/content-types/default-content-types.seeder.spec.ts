import { NotFoundException } from '@nestjs/common';
import { DefaultContentTypesSeeder } from './default-content-types.seeder.js';
import { DEFAULT_CONTENT_TYPES } from './default-content-types.data.js';
import type { ContentTypesRepository } from './content-types.repository.js';

describe('DefaultContentTypesSeeder', () => {
  let seeder: DefaultContentTypesSeeder;
  let repo: { findByKey: jest.Mock; create: jest.Mock };
  const allKeys = DEFAULT_CONTENT_TYPES.map((ct) => ct.key);

  beforeEach(() => {
    repo = {
      findByKey: jest.fn().mockRejectedValue(new NotFoundException()),
      create: jest.fn().mockResolvedValue({}),
    };
    seeder = new DefaultContentTypesSeeder(
      repo as unknown as ContentTypesRepository,
    );
  });

  it('defines exactly the five baseline content types', () => {
    expect(allKeys).toEqual([
      'site-identity',
      'hero-section',
      'article',
      'testimonial',
      'faq',
    ]);
    expect(
      Object.fromEntries(
        DEFAULT_CONTENT_TYPES.map((ct) => [ct.key, ct.isSingleton]),
      ),
    ).toEqual({
      'site-identity': true,
      'hero-section': true,
      article: false,
      testimonial: false,
      faq: false,
    });
    expect(DEFAULT_CONTENT_TYPES.map((ct) => ct.fields.length)).toEqual([
      7, 5, 6, 5, 3,
    ]);
  });

  it('creates all types when none exist', async () => {
    const result = await seeder.seed();

    expect(result).toEqual({ created: allKeys, skipped: [], failed: [] });
    expect(repo.create).toHaveBeenCalledTimes(5);
    expect(repo.create).toHaveBeenCalledWith(DEFAULT_CONTENT_TYPES[0]);
  });

  it('is idempotent: skips types that already exist', async () => {
    repo.findByKey.mockResolvedValue({ id: 'x' });

    const result = await seeder.seed();

    expect(result).toEqual({ created: [], skipped: allKeys, failed: [] });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('creates only the missing types on partial state', async () => {
    repo.findByKey.mockImplementation((key: string) =>
      key === 'article' || key === 'faq'
        ? Promise.resolve({ id: key })
        : Promise.reject(new NotFoundException()),
    );

    const result = await seeder.seed();

    expect(result.skipped).toEqual(['article', 'faq']);
    expect(result.created).toEqual([
      'site-identity',
      'hero-section',
      'testimonial',
    ]);
  });

  it('treats unique violation (P2002) from concurrent seeding as skipped', async () => {
    repo.create.mockRejectedValueOnce({ code: 'P2002' });

    const result = await seeder.seed();

    expect(result.skipped).toEqual(['site-identity']);
    expect(result.created).toHaveLength(4);
    expect(result.failed).toEqual([]);
  });

  it('records lookup and create errors as failed and continues', async () => {
    repo.findByKey.mockRejectedValueOnce(new Error('db down'));
    repo.create.mockRejectedValueOnce('boom');

    const result = await seeder.seed();

    expect(result.failed).toEqual(['site-identity', 'hero-section']);
    expect(result.created).toEqual(['article', 'testimonial', 'faq']);
  });

  it('onApplicationBootstrap runs the seed and never throws', async () => {
    repo.findByKey.mockRejectedValue(new Error('db down'));

    await expect(seeder.onApplicationBootstrap()).resolves.toBeUndefined();
    expect(repo.create).not.toHaveBeenCalled();
  });
});
