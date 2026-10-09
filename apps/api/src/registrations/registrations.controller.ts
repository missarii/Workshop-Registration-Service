import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { RegistrationsService } from './registrations.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('registrations')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('workshops/:workshopId/registrations')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Get()
  @Roles(Role.MANAGER, Role.STAFF)
  @ApiOperation({ summary: 'List all registrations for a workshop (including history)' })
  findAll(@Param('workshopId') workshopId: string) {
    return this.registrationsService.findByWorkshop(workshopId);
  }

  @Post()
  @Roles(Role.MANAGER, Role.STAFF)
  @ApiOperation({ summary: 'Register an attendee for a workshop' })
  create(
    @Param('workshopId') workshopId: string,
    @Body() dto: CreateRegistrationDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.registrationsService.create(workshopId, dto, actorId);
  }

  @Patch(':registrationId/cancel')
  @Roles(Role.MANAGER, Role.STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a registration (seat is freed, record preserved)' })
  cancel(
    @Param('workshopId') workshopId: string,
    @Param('registrationId') registrationId: string,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.registrationsService.cancel(workshopId, registrationId, actorId);
  }
}

// Also expose a top-level registrations endpoint for global history view
@ApiTags('registrations')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('registrations')
export class RegistrationsGlobalController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Get()
  @Roles(Role.MANAGER, Role.STAFF)
  @ApiOperation({ summary: 'List all registrations across all workshops' })
  @ApiQuery({ name: 'workshopId', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @Query('workshopId') workshopId?: string,
    @Query('status') status?: string,
  ) {
    return this.registrationsService.findAll({ workshopId, status });
  }
}
