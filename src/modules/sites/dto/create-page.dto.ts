import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PageStatus } from '@prisma/client';

export class CreatePageDto {
  @ApiProperty({
    example: '/about',
    description: 'Page route path starting with /',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\/[a-zA-Z0-9\-_/]*$/, {
    message:
      'route must start with / and contain only alphanumeric characters, dashes, and underscores',
  })
  @MaxLength(150)
  route!: string;

  @ApiProperty({ example: 'Tentang Kami' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ enum: PageStatus, default: PageStatus.DRAFT })
  @IsEnum(PageStatus)
  @IsOptional()
  status?: PageStatus;

  @ApiPropertyOptional({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  isHome?: boolean;

  @ApiPropertyOptional({
    description: 'Array of visual block objects [{ id, type, props }]',
    example: [{ id: 'blk-1', type: 'hero', props: { headline: 'Halo' } }],
  })
  @IsOptional()
  blocks?: Record<string, unknown>[];

  @ApiPropertyOptional({ example: 'id', default: 'id' })
  @IsString()
  @IsOptional()
  locale?: string;

  @ApiPropertyOptional({ example: 'Tentang Resto Kami' })
  @IsString()
  @IsOptional()
  metaTitle?: string;

  @ApiPropertyOptional({ example: 'Deskripsi singkat profil resto...' })
  @IsString()
  @IsOptional()
  metaDescription?: string;

  @ApiPropertyOptional({ example: 'https://domain.com/about' })
  @IsString()
  @IsOptional()
  canonicalUrl?: string;

  @ApiPropertyOptional({ example: 'Tentang Kami - Resto' })
  @IsString()
  @IsOptional()
  ogTitle?: string;

  @ApiPropertyOptional({ example: 'asset-uuid-1' })
  @IsString()
  @IsOptional()
  ogImageAssetId?: string;

  @ApiPropertyOptional({ example: 'index,follow', default: 'index,follow' })
  @IsString()
  @IsOptional()
  robots?: string;
}
