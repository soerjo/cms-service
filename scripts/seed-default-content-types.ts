import { NestFactory } from '@nestjs/core';
import type * as AppModuleExports from '../src/app.module.js';
import type * as SeederExports from '../src/modules/content-types/default-content-types.seeder.js';

// Dynamic import is intentional: the script runs against compiled `dist/`
// when present (production image) and falls back to `src/` (bun dev), so the
// specifier is selected at runtime.
async function importFromDistOrSrc<T>(
  distPath: string,
  srcPath: string,
): Promise<T> {
  try {
    return (await import(distPath)) as T;
  } catch {
    return (await import(srcPath)) as T;
  }
}

async function seed() {
  const { AppModule } = await importFromDistOrSrc<typeof AppModuleExports>(
    '../dist/app.module.js',
    '../src/app.module.js',
  );

  const { DefaultContentTypesSeeder } = await importFromDistOrSrc<
    typeof SeederExports
  >(
    '../dist/modules/content-types/default-content-types.seeder.js',
    '../src/modules/content-types/default-content-types.seeder.js',
  );

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  console.log('--- Starting Default Content Types Seeder ---');

  // Same idempotent seeder that runs on application bootstrap, so the five
  // default types (site-identity, hero-section, article, testimonial, faq)
  // are defined in a single place.
  const result = await app.get(DefaultContentTypesSeeder).seed();

  console.log(
    `Created: [${result.created.join(', ')}] Skipped: [${result.skipped.join(', ')}] Failed: [${result.failed.join(', ')}]`,
  );
  console.log('--- Default Content Types Seeding Completed ---');
  await app.close();

  if (result.failed.length > 0) {
    process.exit(1);
  }
}

seed().catch((err) => {
  console.error('Fatal seeder error:', err);
  process.exit(1);
});
