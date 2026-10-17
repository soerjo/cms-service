import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ContentTypesService } from './content-types.service.js';
import { CreateContentTypeDto } from './dto/create-content-type.dto.js';
import { UpdateContentTypeDto } from './dto/update-content-type.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@ApiTags('Content Types')
@ApiBearerAuth()
@Roles('ums:admin')
@Controller('content-types')
export class ContentTypesController {
  constructor(private service: ContentTypesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new content type (Admin/Author)' })
  create(@Body() dto: CreateContentTypeDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all content types' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get content type by ID' })
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update content type by ID' })
  update(@Param('id') id: string, @Body() dto: UpdateContentTypeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete content type by ID' })
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
