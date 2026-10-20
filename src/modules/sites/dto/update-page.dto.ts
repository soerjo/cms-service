import { PartialType } from '@nestjs/swagger';
import { CreatePageDto } from './create-page.dto.js';

export class UpdatePageDto extends PartialType(CreatePageDto) {}
