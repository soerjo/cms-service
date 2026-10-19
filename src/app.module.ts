import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { MetricsModule } from './modules/metrics/metrics.module.js';
import { JwtAuthModule } from './common/auth/jwt-auth.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { ContentTypesModule } from './modules/content-types/content-types.module.js';
import { ContentModule } from './modules/content/content.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { TagsModule } from './modules/tags/tags.module.js';
import { MediaModule } from './modules/media/media.module.js';
import { DeliveryModule } from './modules/delivery/delivery.module.js';
import { SitesModule } from './modules/sites/sites.module.js';
import { loggerConfig } from './config/logger.config.js';
import { validate } from './config/env.validation.js';
import { InterServiceHttpClientModule } from './common/http-client/http-client.module.js';

@Module({
  imports: [
    InterServiceHttpClientModule,
    ConfigModule.forRoot({ isGlobal: true, validate }),
    WinstonModule.forRoot(loggerConfig),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>('THROTTLE_TTL_MS', 60000),
            limit: configService.get<number>('THROTTLE_LIMIT', 10),
          },
        ],
      }),
    }),
    PrismaModule,
    ScheduleModule.forRoot(),
    JwtAuthModule,
    HealthModule,
    MetricsModule,
    ContentTypesModule,
    ContentModule,
    CategoriesModule,
    TagsModule,
    MediaModule,
    DeliveryModule,
    SitesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
