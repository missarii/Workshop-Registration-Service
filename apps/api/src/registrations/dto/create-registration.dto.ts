import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRegistrationDto {
  @ApiProperty({ example: 'John Smith' })
  @IsString()
  @MinLength(2)
  attendeeName: string;

  @ApiProperty({ example: 'john.smith@example.com' })
  @IsEmail()
  attendeeEmail: string;
}
