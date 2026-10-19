import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { SiteStatus } from '@prisma/client';

export class UpdateSiteDto {
  @ApiPropertyOptional({ example: 'Kopi Kenangan Baru' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'kopibaru.id' })
  @IsString()
  @IsOptional()
  domain?: string;

  @ApiPropertyOptional({ enum: SiteStatus, default: SiteStatus.ACTIVE })
  @IsEnum(SiteStatus)
  @IsOptional()
  status?: SiteStatus;

  @ApiPropertyOptional({ example: 'en' })
  @IsString()
  @IsOptional()
  defaultLocale?: string;

  @ApiPropertyOptional({ example: 'Asia/Makassar' })
  @IsString()
  @IsOptional()
  timezone?: string;
}
