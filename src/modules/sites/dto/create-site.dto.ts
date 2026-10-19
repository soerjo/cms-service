import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateSiteDto {
  @ApiProperty({ example: 'Kopi Kenangan Senopati' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    example: 'kopi-kenangan',
    description: 'URL-friendly slug for /s/{key}',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message:
      'key must contain only lowercase alphanumeric characters and hyphens',
  })
  @MaxLength(50)
  key!: string;

  @ApiPropertyOptional({ example: 'kopikenangan.id' })
  @IsString()
  @IsOptional()
  domain?: string;

  @ApiPropertyOptional({ example: 'id', default: 'id' })
  @IsString()
  @IsOptional()
  defaultLocale?: string;

  @ApiPropertyOptional({ example: 'Asia/Jakarta', default: 'Asia/Jakarta' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({
    example: 'resto-web-profile',
    description:
      'Optional starter template key (resto-web-profile | toko-retail-profile | jasa-service-profile)',
  })
  @IsString()
  @IsOptional()
  templateKey?: string;
}
