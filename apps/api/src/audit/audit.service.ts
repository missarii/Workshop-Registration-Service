import { Injectable } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

interface AuditLogParams {
  actorId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: AuditLogParams) {
    return this.prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata || {},
      },
    });
  }

  async findAll(filters?: {
    entityType?: string;
    entityId?: string;
    actorId?: string;
    action?: AuditAction;
    skip?: number;
    take?: number;
  }) {
    const where: any = {};
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.entityId) where.entityId = filters.entityId;
    if (filters?.actorId) where.actorId = filters.actorId;
    if (filters?.action) where.action = filters.action;

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: filters?.skip ?? 0,
        take: filters?.take ?? 50,
      }),
    ]);

    return { total, logs };
  }
}
