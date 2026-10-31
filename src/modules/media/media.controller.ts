import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Query,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { MediaService } from './media.service.js';
import { QueryMediaDto } from './dto/query-media.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { AuthUser } from '../../common/interfaces/auth-user.interface.js';

@ApiTags('Media')
@ApiBearerAuth()
@Roles('ums:admin')
@Controller('media')
export class MediaController {
  constructor(private service: MediaService) {}

  @Post()
  @ApiOperation({ summary: 'Upload single media asset (multipart)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.service.upload(file, user.id);
  }

  @Post('bulk')
  @ApiOperation({
    summary: 'Upload multiple media assets simultaneously (multipart)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10))
  uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: AuthUser,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }
    return this.service.uploadMultiple(files, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List media assets' })
  findAll(@Query() query: QueryMediaDto) {
    const pageNum = query.page ?? 1;
    const limitNum = query.limit ?? 20;
    const skip = (pageNum - 1) * limitNum;
    return this.service.findAll(skip, limitNum);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get media asset by ID' })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete media asset by ID' })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.delete(id);
  }
}
