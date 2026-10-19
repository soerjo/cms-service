import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { AppModule } from '../src/app.module';

// Provide required environment variables for Nest bootstrap
process.env.NODE_ENV = 'test';
process.env.FILE_SERVICE_URL = process.env.FILE_SERVICE_URL || 'https://dummy.fileservice.com';
process.env.FILE_SERVICE_EMAIL = process.env.FILE_SERVICE_EMAIL || 'dummy@fileservice.com';
process.env.FILE_SERVICE_PASSWORD = process.env.FILE_SERVICE_PASSWORD || 'dummyPassword';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/db';
process.env.UMS_JWT_PUBLIC_KEY = process.env.UMS_JWT_PUBLIC_KEY || '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Y8+test\n-----END PUBLIC KEY-----';

async function generate() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('CMS API')
    .setDescription('My CMS Service API documentation')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const outputPath = resolve(process.cwd(), 'contracts/openapi.json');
  mkdirSync(dirname(outputPath), { recursive: true });

  const sortedKeys = (obj: any): any => {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
      return obj;
    }
    const sorted: Record<string, any> = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = sortedKeys(obj[key]);
    }
    return sorted;
  };

  const formattedJson = JSON.stringify(sortedKeys(document), null, 2) + '\n';
  writeFileSync(outputPath, formattedJson, 'utf-8');

  const pathCount = Object.keys(document.paths || {}).length;
  console.log(`[docs:openapi] generated ${outputPath} — ${pathCount} paths`);

  await app.close();
}

generate().catch((err) => {
  console.error('Failed to generate OpenAPI contract:', err);
  process.exit(1);
});
