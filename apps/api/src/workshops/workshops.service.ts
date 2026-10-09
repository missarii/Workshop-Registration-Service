import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { WorkshopStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import { WorkshopFilterDto } from './dto/workshop-filter.dto';

@Injectable()
export class WorkshopsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(filters: WorkshopFilterDto) {
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.locationId) {
      where.locationId = filters.locationId;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.startsAt = {};
      if (filters.dateFrom) where.startsAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.startsAt.lte = new Date(filters.dateTo);
    }

    const wantsAvailability = filters.hasAvailability === 'true' || filters.hasAvailability === true;

    // Build query with availability filter
    let workshops;
    if (wantsAvailability) {
      // Need to filter where reservedSeats < capacity
      workshops = await this.prisma.workshop.findMany({
        where: {
          ...where,
          status: WorkshopStatus.SCHEDULED,
        },
        include: {
          location: true,
          _count: {
            select: {
              registrations: { where: { status: 'ACTIVE' } },
            },
          },
        },
        orderBy: { startsAt: 'asc' },
      });
      // Filter in application code for availability
      workshops = workshops.filter((w) => w.reservedSeats < w.capacity);
    } else {
      workshops = await this.prisma.workshop.findMany({
        where,
        include: {
          location: true,
          _count: {
            select: {
              registrations: { where: { status: 'ACTIVE' } },
            },
          },
        },
        orderBy: { startsAt: 'asc' },
      });
    }

    return workshops.map((w) => ({
      ...w,
      availableSeats: w.capacity - w.reservedSeats,
      activeRegistrations: w._count.registrations,
    }));
  }

  async findOne(id: string) {
    const workshop = await this.prisma.workshop.findUnique({
      where: { id },
      include: {
        location: true,
        registrations: {
          include: {
            registeredBy: { select: { id: true, name: true } },
            cancelledBy: { select: { id: true, name: true } },
          },
          orderBy: { registeredAt: 'desc' },
        },
      },
    });

    if (!workshop) {
      throw new NotFoundException(`Workshop ${id} not found`);
    }

    return {
      ...workshop,
      availableSeats: workshop.capacity - workshop.reservedSeats,
    };
  }

  async create(dto: CreateWorkshopDto, actorId: string) {
    const existing = await this.prisma.workshop.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Workshop code '${dto.code}' already exists`);
    }

    if (new Date(dto.startsAt) >= new Date(dto.endsAt)) {
      throw new BadRequestException('Start time must be before end time');
    }

    if (dto.capacity < 1) {
      throw new BadRequestException('Capacity must be at least 1');
    }

    // Verify location exists
    const location = await this.prisma.location.findUnique({
      where: { id: dto.locationId },
    });
    if (!location) {
      throw new NotFoundException(`Location ${dto.locationId} not found`);
    }

    const workshop = await this.prisma.workshop.create({
      data: {
        code: dto.code.toUpperCase(),
        title: dto.title,
        description: dto.description,
        instructor: dto.instructor,
        locationId: dto.locationId,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        capacity: dto.capacity,
        status: WorkshopStatus.SCHEDULED,
      },
      include: { location: true },
    });

    await this.audit.log({
      actorId,
      action: 'WORKSHOP_CREATED',
      entityType: 'workshop',
      entityId: workshop.id,
      metadata: { code: workshop.code, title: workshop.title, capacity: workshop.capacity },
    });

    return { ...workshop, availableSeats: workshop.capacity - workshop.reservedSeats };
  }

  async update(id: string, dto: UpdateWorkshopDto, actorId: string) {
    const workshop = await this.prisma.workshop.findUnique({ where: { id } });
    if (!workshop) throw new NotFoundException(`Workshop ${id} not found`);

    if (workshop.status === WorkshopStatus.CANCELLED) {
      throw new BadRequestException('Cannot update a cancelled workshop');
    }

    // Check if reducing capacity below reserved
    if (dto.capacity !== undefined && dto.capacity < workshop.reservedSeats) {
      throw new BadRequestException(
        `Cannot reduce capacity to ${dto.capacity}: ${workshop.reservedSeats} seats are already reserved`,
      );
    }

    const data: any = {};
    if (dto.title) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.instructor) data.instructor = dto.instructor;
    if (dto.locationId) data.locationId = dto.locationId;
    if (dto.startsAt) data.startsAt = new Date(dto.startsAt);
    if (dto.endsAt) data.endsAt = new Date(dto.endsAt);
    if (dto.capacity !== undefined) data.capacity = dto.capacity;

    const updated = await this.prisma.workshop.update({
      where: { id },
      data,
      include: { location: true },
    });

    await this.audit.log({
      actorId,
      action: 'WORKSHOP_UPDATED',
      entityType: 'workshop',
      entityId: id,
      metadata: { changes: dto, previousCapacity: workshop.capacity },
    });

    return { ...updated, availableSeats: updated.capacity - updated.reservedSeats };
  }

  async cancel(id: string, reason: string, actorId: string) {
    const workshop = await this.prisma.workshop.findUnique({ where: { id } });
    if (!workshop) throw new NotFoundException(`Workshop ${id} not found`);

    if (workshop.status === WorkshopStatus.CANCELLED) {
      throw new BadRequestException('Workshop is already cancelled');
    }

    const updated = await this.prisma.workshop.update({
      where: { id },
      data: {
        status: WorkshopStatus.CANCELLED,
        cancelReason: reason,
      },
    });

    await this.audit.log({
      actorId,
      action: 'WORKSHOP_CANCELLED',
      entityType: 'workshop',
      entityId: id,
      metadata: { reason, previousStatus: workshop.status },
    });

    return updated;
  }

  async getLocations() {
    return this.prisma.location.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }
}
