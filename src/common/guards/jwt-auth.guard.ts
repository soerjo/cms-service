import { timingSafeEqual } from 'node:crypto';
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import {
  DEFAULT_MCP_API_KEY,
  MCP_API_KEY_ENV,
  MCP_API_KEY_HEADER,
} from '../constants/mcp.constants.js';
import type { AuthUser } from '../interfaces/auth-user.interface.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>;
      user?: AuthUser;
    }>();
    const provided = request.headers?.[MCP_API_KEY_HEADER];
    if (provided !== undefined) {
      if (!this.isValidMcpApiKey(provided)) {
        throw new UnauthorizedException('Invalid MCP API key');
      }
      request.user = {
        id: 'system:mcp-agent',
        email: 'mcp-agent@internal.local',
        roles: ['ums:admin', 'cms:admin'],
      };
      return true;
    }

    return super.canActivate(context);
  }

  private resolveExpectedKey(): string | undefined {
    const configured = this.configService.get<string>(MCP_API_KEY_ENV);
    if (configured) return configured;
    // Unset: the local-dev default is only accepted outside production.
    return this.configService.get<string>('NODE_ENV') === 'production'
      ? undefined
      : DEFAULT_MCP_API_KEY;
  }

  private isValidMcpApiKey(provided: string | string[]): boolean {
    const expected = this.resolveExpectedKey();
    if (!expected || typeof provided !== 'string' || provided.length === 0) {
      return false;
    }
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
