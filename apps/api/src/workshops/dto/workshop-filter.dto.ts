import { IsOptional, IsEnum, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { WorkshopStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

export class WorkshopFilterDto {
  @ApiPropertyOptional({ enum: WorkshopStatus })
  @IsOptional()
  @IsEnum(WorkshopStatus)
  status?: WorkshopStatus;

  @ApiPropertyOptional({ description: 'ISO date string for range start' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'ISO date string for range end' })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Filter by location ID' })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiPropertyOptional({ description: 'Only show workshops with available seats' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  hasAvailability?: boolean | string;
}
