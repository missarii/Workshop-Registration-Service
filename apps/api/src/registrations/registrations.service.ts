import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { WorkshopStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';

@Injectable()
export class RegistrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findByWorkshop(workshopId: string) {
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: workshopId },
    });
    if (!workshop) throw new NotFoundException(`Workshop ${workshopId} not found`);

    return this.prisma.registration.findMany({
      where: { workshopId },
      include: {
        registeredBy: { select: { id: true, name: true, email: true } },
        cancelledBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { registeredAt: 'desc' },
    });
  }

  /**
   * Atomically reserve a seat and create a registration.
   *
   * Uses a single PostgreSQL UPDATE with a WHERE clause that checks both
   * status=SCHEDULED and reserved_seats < capacity. If no row is updated,
   * the workshop is full or not available. This prevents race conditions
   * where two concurrent requests both read the same remaining count.
   *
   * The registration insert and audit log happen in the same transaction,
   * so the entire operation is atomic.
   */
  async create(workshopId: string, dto: CreateRegistrationDto, actorId: string) {
    // First, verify the workshop exists at all
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: workshopId },
    });

    if (!workshop) {
      throw new NotFoundException(`Workshop ${workshopId} not found`);
    }

    if (workshop.status !== WorkshopStatus.SCHEDULED) {
      throw new BadRequestException(
        `Workshop is not accepting registrations (status: ${workshop.status})`,
      );
    }

    // Check for duplicate active registration
    const existing = await this.prisma.registration.findFirst({
      where: {
        workshopId,
        attendeeEmail: dto.attendeeEmail.toLowerCase(),
        status: 'ACTIVE',
      },
    });

    if (existing) {
      throw new ConflictException(
        `${dto.attendeeEmail} is already actively registered for this workshop`,
      );
    }

    // THE CRITICAL SECTION: Atomic seat reservation + registration in a transaction
    // The UPDATE only succeeds if reserved_seats < capacity AND status = SCHEDULED
    // This prevents overbooking even under concurrent requests
    let result;
    try {
      result = await this.prisma.$transaction(async (tx) => {
      // Atomically increment reserved_seats — only if a seat is available
      const updated = await tx.$executeRaw`
        UPDATE workshops
        SET reserved_seats = reserved_seats + 1
        WHERE id = ${workshopId}
          AND status = 'SCHEDULED'
          AND reserved_seats < capacity
      `;

      if (updated === 0) {
        // Either workshop is full, or status changed between our initial check
        const current = await tx.workshop.findUnique({ where: { id: workshopId } });
        if (current?.status !== WorkshopStatus.SCHEDULED) {
          throw new BadRequestException('Workshop is no longer accepting registrations');
        }
        throw new ConflictException(
          `Workshop is full (capacity: ${workshop.capacity}). No seats available.`,
        );
      }

      // Seat reserved successfully — create the registration record
      const registration = await tx.registration.create({
        data: {
          workshopId,
          attendeeName: dto.attendeeName,
          attendeeEmail: dto.attendeeEmail.toLowerCase(),
          status: 'ACTIVE',
          registeredById: actorId,
        },
        include: {
          registeredBy: { select: { id: true, name: true } },
          workshop: { select: { id: true, code: true, title: true } },
        },
      });

      // Audit log inside same transaction
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'REGISTRATION_CREATED',
          entityType: 'registration',
          entityId: registration.id,
          metadata: {
            workshopId,
            workshopCode: registration.workshop.code,
            attendeeEmail: dto.attendeeEmail,
            attendeeName: dto.attendeeName,
          },
        },
      });

      return registration;
      });
    } catch (e) {
      // A concurrent request may have created the same active registration
      // between our pre-check and the insert (partial unique index on
      // workshopId + attendeeEmail + status). Map it to a clean 409.
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(
          `${dto.attendeeEmail} is already actively registered for this workshop`,
        );
      }
      throw new InternalServerErrorException('Failed to create registration');
    }

    return result;
  }

  /**
   * Cancel a registration and atomically release the seat.
   * Uses a conditional UPDATE (status ACTIVE -> CANCELLED) so that two
   * concurrent cancels of the same registration cannot both decrement
   * reserved_seats — only the request that flips the status frees a seat.
   */
  async cancel(workshopId: string, registrationId: string, actorId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      // Atomically flip status ACTIVE -> CANCELLED. If no row is updated,
      // the registration either doesn't exist or is already cancelled.
      const flipped = await tx.registration.updateMany({
        where: { id: registrationId, workshopId, status: 'ACTIVE' },
        data: {
          status: 'CANCELLED',
          cancelledById: actorId,
          cancelledAt: new Date(),
        },
      });

      if (flipped.count === 0) {
        const existing = await tx.registration.findFirst({
          where: { id: registrationId, workshopId },
        });
        if (!existing) {
          throw new NotFoundException(`Registration ${registrationId} not found`);
        }
        throw new BadRequestException('Registration is already cancelled');
      }

      const updated = await tx.registration.findUniqueOrThrow({
        where: { id: registrationId },
        include: {
          cancelledBy: { select: { id: true, name: true } },
          workshop: { select: { id: true, code: true, title: true } },
        },
      });

      // Decrement reserved_seats exactly once — the request that flipped
      // the status is the only one that reaches here.
      await tx.$executeRaw`
        UPDATE workshops
        SET reserved_seats = GREATEST(reserved_seats - 1, 0)
        WHERE id = ${workshopId}
      `;

      // Audit log inside same transaction
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'REGISTRATION_CANCELLED',
          entityType: 'registration',
          entityId: registrationId,
          metadata: {
            workshopId,
            workshopCode: updated.workshop.code,
            attendeeEmail: updated.attendeeEmail,
            attendeeName: updated.attendeeName,
          },
        },
      });

      return updated;
    });

    return result;
  }

  async findAll(filters?: { workshopId?: string; status?: string }) {
    const where: any = {};
    if (filters?.workshopId) where.workshopId = filters.workshopId;
    if (filters?.status) where.status = filters.status;

    return this.prisma.registration.findMany({
      where,
      include: {
        workshop: { select: { id: true, code: true, title: true, startsAt: true } },
        registeredBy: { select: { id: true, name: true } },
        cancelledBy: { select: { id: true, name: true } },
      },
      orderBy: { registeredAt: 'desc' },
    });
  }
}
