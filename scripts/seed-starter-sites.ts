import { NestFactory } from '@nestjs/core';

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

interface SeedSiteDef {
  key: string;
  name: string;
  templateKey: string;
  domain?: string;
}

const STARTER_SITES: SeedSiteDef[] = [
  {
    key: 'resto-demo',
    name: 'Resto Nusantara Demo',
    templateKey: 'resto-web-profile',
    domain: 'resto-demo.cms.local',
  },
  {
    key: 'toko-demo',
    name: 'Toko Retail Pilihan Demo',
    templateKey: 'toko-retail-profile',
    domain: 'toko-demo.cms.local',
  },
  {
    key: 'jasa-demo',
    name: 'Solusi Jasa Profesional Demo',
    templateKey: 'jasa-service-profile',
    domain: 'jasa-demo.cms.local',
  },
];

async function seed() {
  const { AppModule } = await importFromDistOrSrc<
    typeof import('../src/app.module.js')
  >('../dist/app.module.js', '../src/app.module.js');

  const { SitesService } = await importFromDistOrSrc<
    typeof import('../src/modules/sites/sites.service.js')
  >('../dist/modules/sites/sites.service.js', '../src/modules/sites/sites.service.js');

  process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  process.env.FILE_SERVICE_URL =
    process.env.FILE_SERVICE_URL || 'https://dummy.fileservice.com';
  process.env.FILE_SERVICE_EMAIL =
    process.env.FILE_SERVICE_EMAIL || 'dummy@fileservice.com';
  process.env.FILE_SERVICE_PASSWORD =
    process.env.FILE_SERVICE_PASSWORD || 'dummyPassword';
  process.env.DATABASE_URL =
    process.env.DATABASE_URL || 'postgresql://user:***@localhost:5432/db';
  process.env.UMS_JWT_PUBLIC_KEY =
    process.env.UMS_JWT_PUBLIC_KEY ||
    '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Y8+test\n-----END PUBLIC KEY-----';

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  const sitesService = app.get(SitesService);

  console.log('--- Starting CMS Starter Sites Seeder ---');

  for (const siteDef of STARTER_SITES) {
    try {
      const existing = await sitesService
        .findSiteByKey(siteDef.key)
        .catch(() => null);

      if (existing) {
        console.log(`[SKIP] Site '${siteDef.key}' already exists.`);
        continue;
      }

      console.log(
        `[SEED] Provisioning site '${siteDef.key}' with template '${siteDef.templateKey}'...`,
      );

      const created = await sitesService.createSite(
        {
          name: siteDef.name,
          key: siteDef.key,
          domain: siteDef.domain,
          templateKey: siteDef.templateKey,
          defaultLocale: 'id',
          timezone: 'Asia/Jakarta',
        },
        {
          id: 'system-seed',
          email: 'admin@system.local',
          roles: ['ums:admin'],
        },
      );

      console.log(`[SUCCESS] Created site '${created.key}' (${created.name}).`);
    } catch (err) {
      console.error(
        `[ERROR] Failed to seed site '${siteDef.key}':`,
        (err as Error).message,
      );
    }
  }

  console.log('--- CMS Starter Sites Seeding Completed ---');
  await app.close();
}

seed().catch((err) => {
  console.error('Fatal seeder error:', err);
  process.exit(1);
});
