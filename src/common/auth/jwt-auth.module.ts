import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../strategies/jwt.strategy.js';
import { UmsJwksService } from './ums-jwks.service.js';

@Module({
  imports: [PassportModule],
  providers: [JwtStrategy, UmsJwksService],
  exports: [PassportModule, UmsJwksService],
})
export class JwtAuthModule {}
