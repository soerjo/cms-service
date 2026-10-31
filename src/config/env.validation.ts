import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPort,
  IsString,
  validateSync,
} from 'class-validator';
import { loadUmsPublicKey } from '../common/utils/ums-jwt-key.util.js';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsPort()
  @IsOptional()
  PORT: string = '3000';

  @IsString()
  @IsOptional()
  DATABASE_URL!: string;

  @IsString()
  @IsOptional()
  UMS_JWT_PUBLIC_KEY?: string;

  @IsString()
  @IsOptional()
  UMS_JWT_PUBLIC_KEY_PATH?: string;

  @IsString()
  @IsOptional()
  FRONTEND_URL: string = 'http://localhost:5173';

  @IsString()
  @IsOptional()
  CORS_ORIGINS?: string;

  @IsString()
  FILE_SERVICE_URL!: string;

  @IsString()
  FILE_SERVICE_EMAIL!: string;

  @IsString()
  FILE_SERVICE_PASSWORD!: string;

  @IsPort()
  @IsOptional()
  FILE_SERVICE_TIMEOUT_MS?: string;

  @IsNumber()
  @IsOptional()
  THROTTLE_TTL_MS: number = 60000;

  @IsNumber()
  @IsOptional()
  THROTTLE_LIMIT: number = 10;
  // --- UMS JWKS integration ---
  @IsString()
  @IsOptional()
  UMS_JWKS_URL?: string;

  @IsString()
  @IsOptional()
  UMS_JWKS_CACHE_TTL_SECONDS?: string;

  // --- MCP service-to-service auth (x-mcp-api-key) ---
  // Optional. When unset the guard falls back to the local-dev key
  // 'mcp-local-dev-key' outside production, and rejects MCP auth in production.
  @IsString()
  @IsOptional()
  CMS_MCP_API_KEY?: string;
}

export function validate(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  // Validate UMS public key configuration ONLY when JWKS URL is not provided.
  // (JWKS is the primary verification source; static key is the offline fallback.)
  if (!validated.UMS_JWKS_URL) {
    try {
      loadUmsPublicKey(
        validated.UMS_JWT_PUBLIC_KEY,
        validated.UMS_JWT_PUBLIC_KEY_PATH,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Configuration validation error: ${message}`);
    }
  }

  return validated;
}
