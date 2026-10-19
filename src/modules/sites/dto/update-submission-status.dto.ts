import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { FormSubmissionStatus } from '@prisma/client';

export class UpdateSubmissionStatusDto {
  @ApiProperty({
    enum: FormSubmissionStatus,
    example: FormSubmissionStatus.PROCESSED,
  })
  @IsEnum(FormSubmissionStatus)
  @IsNotEmpty()
  status!: FormSubmissionStatus;
}
