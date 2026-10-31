import { NestFactory } from '@nestjs/core';
import type { FieldDefinitionDto } from '../src/modules/content-types/dto/create-content-type.dto.js';

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

const DEFAULT_CONTENT_TYPES: {
  key: string;
  name: string;
  description: string;
  isSingleton: boolean;
  fields: FieldDefinitionDto[];
}[] = [
  {
    key: 'article',
    name: 'Artikel Blog',
    description: 'Tipe konten standar untuk artikel berita, tutorial, dan blog post',
    isSingleton: false,
    fields: [
      { key: 'title', type: 'text', label: 'Judul Artikel', required: true },
      { key: 'slug', type: 'text', label: 'URL Slug', required: true },
      { key: 'excerpt', type: 'text', label: 'Ringkasan / Excerpt', required: false },
      { key: 'content', type: 'rich_text', label: 'Isi Konten Lengkap', required: true },
      { key: 'coverImage', type: 'media', label: 'Gambar Utama (Cover)', required: false },
      { key: 'readingTime', type: 'number', label: 'Estimasi Waktu Baca (Menit)', required: false },
    ],
  },
  {
    key: 'site-identity',
    name: 'Identitas & Profil Situs',
    description: 'Pengaturan global identitas website, kontak, dan logo (Singleton)',
    isSingleton: true,
    fields: [
      { key: 'brandName', type: 'text', label: 'Nama Brand / Bisnis', required: true },
      { key: 'tagline', type: 'text', label: 'Tagline Slogan', required: false },
      { key: 'logoImage', type: 'media', label: 'Logo Utama', required: false },
      { key: 'contactEmail', type: 'text', label: 'Email Publik', required: true },
      { key: 'contactPhone', type: 'text', label: 'Nomor WhatsApp / Telepon', required: false },
      { key: 'address', type: 'text', label: 'Alamat Fisik', required: false },
    ],
  },
  {
    key: 'testimonial',
    name: 'Testimonial & Review',
    description: 'Ulasan dan testimoni pelanggan untuk social proof',
    isSingleton: false,
    fields: [
      { key: 'clientName', type: 'text', label: 'Nama Klien / Pelanggan', required: true },
      { key: 'clientRole', type: 'text', label: 'Jabatan / Perusahaan', required: false },
      { key: 'avatar', type: 'media', label: 'Foto Avatar', required: false },
      { key: 'rating', type: 'number', label: 'Bintang Rating (1-5)', required: true },
      { key: 'quote', type: 'text', label: 'Kutipan Ulasan', required: true },
    ],
  },
];

async function seed() {
  const { AppModule } = await importFromDistOrSrc<
    typeof import('../src/app.module.js')
  >('../dist/app.module.js', '../src/app.module.js');

  const { ContentTypesService } = await importFromDistOrSrc<
    typeof import('../src/modules/content-types/content-types.service.js')
  >(
    '../dist/modules/content-types/content-types.service.js',
    '../src/modules/content-types/content-types.service.js',
  );

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  const contentTypesService = app.get(ContentTypesService);

  console.log('--- Starting Default Content Types Seeder ---');

  for (const ct of DEFAULT_CONTENT_TYPES) {
    try {
      const existing = await contentTypesService.findByKey(ct.key).catch(() => null);
      if (existing) {
        console.log(`[SKIP] ContentType '${ct.key}' already exists.`);
        continue;
      }

      console.log(`[SEED] Creating ContentType '${ct.key}' (${ct.name})...`);
      const created = await contentTypesService.create({
        key: ct.key,
        name: ct.name,
        description: ct.description,
        isSingleton: ct.isSingleton,
        fields: ct.fields,
      });

      console.log(`[SUCCESS] Created ContentType '${created.key}' (ID: ${created.id}).`);
    } catch (err) {
      console.error(`[ERROR] Failed to seed ContentType '${ct.key}':`, (err as Error).message);
    }
  }

  console.log('--- Default Content Types Seeding Completed ---');
  await app.close();
}

seed().catch((err) => {
  console.error('Fatal seeder error:', err);
  process.exit(1);
});
