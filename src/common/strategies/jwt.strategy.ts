import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UmsJwksService } from '../auth/ums-jwks.service.js';
import { AuthUser } from '../interfaces/auth-user.interface.js';

/**
 * JWT strategy that verifies access tokens issued by ums-service (RS256).
 * Public keys are resolved dynamically via UmsJwksService:
 *   1. JWKS endpoint (UMS_JWKS_URL) with cache TTL (UMS_JWKS_CACHE_TTL_SECONDS)
 *   2. Fallback to static key (UMS_JWT_PUBLIC_KEY / UMS_JWT_PUBLIC_KEY_PATH)
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly umsJwksService: UmsJwksService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['RS256'],
      secretOrKeyProvider: async (
        _request: unknown,
        _rawJwtToken: unknown,
        done: (err: unknown, secretOrKey: string | Buffer | undefined) => void,
      ) => {
        try {
          // We resolve the available UMS verification keys (JWKS first, static fallback).
          // Passport-jwt cannot easily handle multi-key lookup without the kid; we use
          // the first key resolved (matches single-key deployments) or static fallback.
          const keys = await umsJwksService.getVerificationKeys();
          const keyList = Object.values(keys);
          if (keyList.length === 0) {
            return done(new Error('No UMS verification keys available'), undefined);
          }
          return done(null, keyList[0]);
        } catch (err) {
          return done(err, undefined);
        }
      },
    });
  }

  validate(payload: {
    sub: string;
    email: string;
    roles?: string[];
    orgs?: string[];
  }): AuthUser {
    return {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles,
      orgs: payload.orgs,
    };
  }
}
