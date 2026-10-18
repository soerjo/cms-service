import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';

export class PublishScheduleDto {
  @ApiPropertyOptional({
    description:
      'Optional ISO8601 timestamp. When in the future, the entry is SCHEDULED and auto-published by the scheduler when due.',
    example: '2026-05-01T09:00:00.000Z',
  })
  @IsISO8601()
  @IsOptional()
  scheduledAt?: string;
}
