import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

type FakeRequest = {
  headers: Record<string, string | string[] | undefined>;
  user?: unknown;
};

function buildContext(request: FakeRequest): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class Dummy {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let env: Record<string, string | undefined>;
  let superCanActivate: jest.SpyInstance;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    env = { CMS_MCP_API_KEY: 'secret-key', NODE_ENV: 'test' };
    const config = { get: jest.fn((key: string) => env[key]) };
    guard = new JwtAuthGuard(
      reflector as unknown as Reflector,
      config as unknown as ConfigService,
    );
    // Parent prototype is the passport mixin class; stub its canActivate.
    const parent = Object.getPrototypeOf(JwtAuthGuard.prototype) as {
      canActivate: (ctx: ExecutionContext) => unknown;
    };
    superCanActivate = jest
      .spyOn(parent, 'canActivate')
      .mockReturnValue('passport-result');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('extends the passport jwt guard', () => {
    expect(guard).toBeInstanceOf(AuthGuard('jwt'));
  });

  describe('public routes', () => {
    it('bypasses everything and does not inspect the API key header', () => {
      reflector.getAllAndOverride.mockImplementation((key: string) =>
        key === IS_PUBLIC_KEY ? true : undefined,
      );
      const request: FakeRequest = { headers: { 'x-mcp-api-key': 'wrong' } };

      expect(guard.canActivate(buildContext(request))).toBe(true);
      expect(request.user).toBeUndefined();
      expect(superCanActivate).not.toHaveBeenCalled();
    });
  });

  describe('x-mcp-api-key', () => {
    it('injects the service user and returns true on a matching key', () => {
      const request: FakeRequest = {
        headers: { 'x-mcp-api-key': 'secret-key' },
      };

      expect(guard.canActivate(buildContext(request))).toBe(true);
      expect(request.user).toEqual({
        id: 'system:mcp-agent',
        email: 'mcp-agent@internal.local',
        roles: ['ums:admin', 'cms:admin'],
      });
      expect(superCanActivate).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException on a mismatching key', () => {
      const request: FakeRequest = { headers: { 'x-mcp-api-key': 'nope' } };

      expect(() => guard.canActivate(buildContext(request))).toThrow(
        new UnauthorizedException('Invalid MCP API key'),
      );
      expect(request.user).toBeUndefined();
      expect(superCanActivate).not.toHaveBeenCalled();
    });

    it('rejects a key that is a prefix of the expected key', () => {
      const request: FakeRequest = { headers: { 'x-mcp-api-key': 'secret' } };
      expect(() => guard.canActivate(buildContext(request))).toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an empty key instead of falling through to JWT', () => {
      const request: FakeRequest = { headers: { 'x-mcp-api-key': '' } };
      expect(() => guard.canActivate(buildContext(request))).toThrow(
        UnauthorizedException,
      );
      expect(superCanActivate).not.toHaveBeenCalled();
    });

    it('rejects a repeated header (array value)', () => {
      const request: FakeRequest = {
        headers: { 'x-mcp-api-key': ['secret-key', 'secret-key'] },
      };
      expect(() => guard.canActivate(buildContext(request))).toThrow(
        UnauthorizedException,
      );
    });

    it('accepts the local-dev default key when unset outside production', () => {
      env = { NODE_ENV: 'development' };
      const request: FakeRequest = {
        headers: { 'x-mcp-api-key': 'mcp-local-dev-key' },
      };

      expect(guard.canActivate(buildContext(request))).toBe(true);
      expect((request.user as { id: string }).id).toBe('system:mcp-agent');
    });

    it('refuses the default key when unset in production', () => {
      env = { NODE_ENV: 'production' };
      const request: FakeRequest = {
        headers: { 'x-mcp-api-key': 'mcp-local-dev-key' },
      };

      expect(() => guard.canActivate(buildContext(request))).toThrow(
        new UnauthorizedException('Invalid MCP API key'),
      );
    });

    it('still honours an explicitly configured key in production', () => {
      env = { NODE_ENV: 'production', CMS_MCP_API_KEY: 'prod-key' };
      const request: FakeRequest = { headers: { 'x-mcp-api-key': 'prod-key' } };

      expect(guard.canActivate(buildContext(request))).toBe(true);
    });
  });

  describe('without x-mcp-api-key', () => {
    it('delegates to super.canActivate', () => {
      const request: FakeRequest = {
        headers: { authorization: 'Bearer token' },
      };
      const context = buildContext(request);

      expect(guard.canActivate(context)).toBe('passport-result');
      expect(superCanActivate).toHaveBeenCalledWith(context);
      expect(request.user).toBeUndefined();
    });
  });
});
