import { IsString, IsInt, IsDateString, IsOptional, Min, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkshopDto {
  @ApiProperty({ example: 'POT-003' })
  @IsString()
  @MinLength(3)
  code: string;

  @ApiProperty({ example: 'Introduction to Pottery' })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiPropertyOptional({ example: 'Learn the basics of pottery.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Maria Chen' })
  @IsString()
  instructor: string;

  @ApiProperty({ example: 'loc-downtown' })
  @IsString()
  locationId: string;

  @ApiProperty({ example: '2026-11-01T09:00:00Z' })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ example: '2026-11-01T12:00:00Z' })
  @IsDateString()
  endsAt: string;

  @ApiProperty({ example: 12, minimum: 1 })
  @IsInt()
  @Min(1)
  capacity: number;
}
