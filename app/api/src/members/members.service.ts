import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { JwtPayload } from '../auth/auth.guard.js';
import { Prisma, TenantRole } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { isTenantAdmin, isTenantMember } from '../tenancy/tenant-access.js';

export type Member = {
  id: string;
  name: string;
  email: string;
  role: TenantRole;
  status: 'active';
};

type MemberRow = {
  role: TenantRole;
  user: { id: string; name: string; email: string };
};

function toMember(row: MemberRow): Member {
  return {
    id: row.user.id,
    name: row.user.name,
    email: row.user.email,
    role: row.role,
    // Every stored account can sign in; the schema has no disabled state.
    status: 'active',
  };
}

function parseRole(role: string): TenantRole {
  if (role === TenantRole.ADMIN || role === TenantRole.MEMBER) {
    return role;
  }

  throw new BadRequestException('Role must be ADMIN or MEMBER');
}

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, actor: JwtPayload): Promise<Member[]> {
    if (!isTenantMember(actor, tenantId)) {
      throw new ForbiddenException('You are not a member of this tenant');
    }

    const members = await this.prisma.tenantUser.findMany({
      where: { tenantId },
      orderBy: { user: { name: 'asc' } },
      select: {
        role: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return members.map(toMember);
  }

  async updateRole(
    tenantId: string,
    userId: string,
    role: string,
    actor: JwtPayload,
  ): Promise<Member> {
    const nextRole = parseRole(role);

    if (!isTenantAdmin(actor, tenantId)) {
      throw new ForbiddenException('Only tenant admins can change roles');
    }

    if (actor.sub === userId && nextRole !== TenantRole.ADMIN) {
      throw new ForbiddenException('You cannot remove your own admin access');
    }

    try {
      const updatedMember = await this.prisma.tenantUser.update({
        where: { tenantId_userId: { tenantId, userId } },
        data: { role: nextRole },
        select: {
          role: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });

      return toMember(updatedMember);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Member not found');
      }
      throw error;
    }
  }
}
