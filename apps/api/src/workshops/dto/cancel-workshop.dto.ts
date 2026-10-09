import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelWorkshopDto {
  @ApiProperty({ example: 'Instructor unavailable' })
  @IsString()
  @MinLength(3)
  reason: string;
}
