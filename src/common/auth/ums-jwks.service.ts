import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface UmsJwk {
  kty: string;
  kid: string;
  n: string;
  e: string;
  use?: string;
  alg?: string;
}

interface JwksCacheEntry {
  keys: UmsJwk[];
  fetchedAt: number;
}

/**
 * Fetches and caches UMS JWKS public keys with a configurable TTL.
 * Falls back to the static public key (UMS_JWT_PUBLIC_KEY / _PATH)
 * when the JWKS endpoint is unreachable (offline-safe).
 */
@Injectable()
export class UmsJwksService {
  private readonly logger = new Logger(UmsJwksService.name);
  private cache: JwksCacheEntry | null = null;

  constructor(private readonly configService: ConfigService) {}

  private get cacheTtlMs(): number {
    const ttlSeconds = Number(
      this.configService.get<string>('UMS_JWKS_CACHE_TTL_SECONDS') ?? '3600',
    );
    return ttlSeconds * 1000;
  }

  private get jwksUrl(): string | null {
    return this.configService.get<string>('UMS_JWKS_URL') ?? null;
  }

  private getStaticPem(): string | null {
    const key = this.configService.get<string>('UMS_JWT_PUBLIC_KEY');
    const keyPath = this.configService.get<string>('UMS_JWT_PUBLIC_KEY_PATH');
    if (key) return key.replace(/\\n/g, '\n');
    if (keyPath) {
      const resolved = path.isAbsolute(keyPath)
        ? keyPath
        : path.resolve(process.cwd(), keyPath);
      if (fs.existsSync(resolved)) {
        return fs.readFileSync(resolved, 'utf8');
      }
    }
    return null;
  }

  private static createRsaPemFromJwk(jwk: UmsJwk): string {
    // Lazy import to avoid bundling 'node:crypto' in consumers unnecessarily
    const { createPublicKey } = require('node:crypto');
    const keyObj = createPublicKey({
      key: jwk as unknown as object,
      format: 'jwk',
    });
    return keyObj.export({ type: 'spki', format: 'pem' }).toString();
  }

  async getVerificationKeys(): Promise<Record<string, string>> {
    const url = this.jwksUrl;
    if (!url) {
      const staticKey = this.getStaticPem();
      return staticKey ? { static: staticKey } : {};
    }

    // Check cache freshness
    if (
      this.cache &&
      Date.now() - this.cache.fetchedAt < this.cacheTtlMs
    ) {
      return this.cache.keys.reduce(
        (acc, jwk) => ({ ...acc, [jwk.kid]: UmsJwksService.createRsaPemFromJwk(jwk) }),
        {} as Record<string, string>,
      );
    }

    try {
      this.logger.log(`Fetching JWKS from ${url}`);
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) {
        throw new Error(`JWKS endpoint returned HTTP ${response.status}`);
      }
      const body = (await response.json()) as { keys?: UmsJwk[] };
      const keys = body.keys ?? [];
      if (keys.length === 0) {
        throw new Error('JWKS endpoint returned no keys');
      }
      this.cache = { keys, fetchedAt: Date.now() };
      this.logger.log(`JWKS cache updated (${keys.length} keys)`);
      return keys.reduce(
        (acc, jwk) => ({ ...acc, [jwk.kid]: UmsJwksService.createRsaPemFromJwk(jwk) }),
        {} as Record<string, string>,
      );
    } catch (err) {
      this.logger.error(
        `Failed to fetch JWKS (${(err as Error).message}) — falling back to static key`,
      );
      const staticKey = this.getStaticPem();
      return staticKey ? { static: staticKey } : {};
    }
  }
}
