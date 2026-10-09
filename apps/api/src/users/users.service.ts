import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }

  async create(dto: CreateUserDto, actorId: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    await this.audit.log({
      actorId,
      action: 'USER_CREATED',
      entityType: 'user',
      entityId: user.id,
      metadata: { name: user.name, email: user.email, role: user.role },
    });

    return user;
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);

    // Prevent updating own role/status (admin can't demote themselves)
    if (id === actorId && (dto.role || dto.active === false)) {
      throw new ForbiddenException('Admins cannot modify their own role or deactivate themselves');
    }

    const data: any = {};
    if (dto.name) data.name = dto.name;
    if (dto.role) data.role = dto.role;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.password) data.passwordHash = await argon2.hash(dto.password);

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        updatedAt: true,
      },
    });

    await this.audit.log({
      actorId,
      action: dto.active === false ? 'USER_DEACTIVATED' : 'USER_UPDATED',
      entityType: 'user',
      entityId: id,
      metadata: {
        changes: dto,
        previousRole: user.role,
        previousActive: user.active,
      },
    });

    return updated;
  }
}
