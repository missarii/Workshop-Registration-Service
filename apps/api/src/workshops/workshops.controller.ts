import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { WorkshopsService } from './workshops.service';
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import { CancelWorkshopDto } from './dto/cancel-workshop.dto';
import { WorkshopFilterDto } from './dto/workshop-filter.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('workshops')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('workshops')
export class WorkshopsController {
  constructor(private readonly workshopsService: WorkshopsService) {}

  @Get('locations')
  @Roles(Role.MANAGER, Role.STAFF)
  @ApiOperation({ summary: 'List all active locations' })
  getLocations() {
    return this.workshopsService.getLocations();
  }

  @Get()
  @Roles(Role.MANAGER, Role.STAFF)
  @ApiOperation({ summary: 'List workshops with optional filters' })
  findAll(@Query() filters: WorkshopFilterDto) {
    return this.workshopsService.findAll(filters);
  }

  @Get(':id')
  @Roles(Role.MANAGER, Role.STAFF)
  @ApiOperation({ summary: 'Get a workshop with all registrations' })
  findOne(@Param('id') id: string) {
    return this.workshopsService.findOne(id);
  }

  @Post()
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Create a new workshop (Manager only)' })
  create(@Body() dto: CreateWorkshopDto, @CurrentUser('sub') actorId: string) {
    return this.workshopsService.create(dto, actorId);
  }

  @Patch(':id')
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Update a workshop (Manager only)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkshopDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.workshopsService.update(id, dto, actorId);
  }

  @Delete(':id')
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Cancel a workshop with reason (Manager only)' })
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelWorkshopDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.workshopsService.cancel(id, dto.reason, actorId);
  }
}
