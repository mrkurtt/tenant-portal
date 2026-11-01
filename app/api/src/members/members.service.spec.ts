import { ValidationPipe } from '@nestjs/common';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { createPrismaMock } from '../../test/prisma-mock.js';
import { Prisma, TenantRole } from '../generated/prisma/client.js';
import type { JwtPayload } from '../auth/auth.guard.js';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto.js';
import { MembersService } from './members.service.js';

const acme = 'acme-id';
const globex = 'globex-id';

const memberSelect = {
  role: true,
  user: { select: { id: true, name: true, email: true } },
};

function actor(
  sub: string,
  tenants: { id: string; role: TenantRole }[],
): JwtPayload {
  return { sub, username: sub, tenants };
}

const alice = actor('alice', [{ id: acme, role: TenantRole.ADMIN }]);
const bob = actor('bob', [
  { id: globex, role: TenantRole.ADMIN },
  { id: acme, role: TenantRole.MEMBER },
]);
const dave = actor('dave', [{ id: globex, role: TenantRole.ADMIN }]);

const bobRow = {
  role: TenantRole.MEMBER,
  user: { id: 'bob', name: 'Bob Brown', email: 'bob@example.com' },
};

describe('MembersService', () => {
  const prisma = createPrismaMock();
  const service = new MembersService(prisma);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('returns name, email, role, and active status for that tenant only', async () => {
      prisma.tenantUser.findMany.mockResolvedValue([bobRow]);

      await expect(service.list(acme, bob)).resolves.toEqual([
        {
          id: 'bob',
          name: 'Bob Brown',
          email: 'bob@example.com',
          role: TenantRole.MEMBER,
          status: 'active',
        },
      ]);
      expect(prisma.tenantUser.findMany.mock.calls).toEqual([
        [
          {
            where: { tenantId: acme },
            orderBy: { user: { name: 'asc' } },
            select: memberSelect,
          },
        ],
      ]);
    });

    it('lets a member of the tenant list its members', async () => {
      prisma.tenantUser.findMany.mockResolvedValue([]);

      await expect(service.list(acme, bob)).resolves.toEqual([]);
      expect(prisma.tenantUser.findMany.mock.calls).toHaveLength(1);
    });

    it('rejects an admin of a different tenant before querying', async () => {
      await expect(service.list(acme, dave)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.tenantUser.findMany.mock.calls).toEqual([]);
    });
  });

  describe('updateRole', () => {
    it('lets an admin change another member and writes the compound key', async () => {
      prisma.tenantUser.update.mockResolvedValue({
        ...bobRow,
        role: TenantRole.ADMIN,
      });

      await expect(
        service.updateRole(acme, 'bob', TenantRole.ADMIN, alice),
      ).resolves.toMatchObject({
        id: 'bob',
        role: TenantRole.ADMIN,
        status: 'active',
      });
      expect(prisma.tenantUser.update.mock.calls).toEqual([
        [
          {
            where: { tenantId_userId: { tenantId: acme, userId: 'bob' } },
            data: { role: TenantRole.ADMIN },
            select: memberSelect,
          },
        ],
      ]);
    });

    it('rejects a member, including an admin of another tenant, before writing', async () => {
      await expect(
        service.updateRole(acme, 'alice', TenantRole.MEMBER, bob),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.tenantUser.update.mock.calls).toEqual([]);
    });

    it('rejects an admin of a different tenant before writing', async () => {
      await expect(
        service.updateRole(acme, 'bob', TenantRole.ADMIN, dave),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.tenantUser.update.mock.calls).toEqual([]);
    });

    it('rejects an admin removing their own admin access', async () => {
      await expect(
        service.updateRole(acme, 'alice', TenantRole.MEMBER, alice),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.tenantUser.update.mock.calls).toEqual([]);
    });

    it('lets an admin keep their own admin role', async () => {
      prisma.tenantUser.update.mockResolvedValue({
        role: TenantRole.ADMIN,
        user: {
          id: 'alice',
          name: 'Alice Anderson',
          email: 'alice@example.com',
        },
      });

      await expect(
        service.updateRole(acme, 'alice', TenantRole.ADMIN, alice),
      ).resolves.toMatchObject({ role: TenantRole.ADMIN });
      expect(prisma.tenantUser.update.mock.calls).toHaveLength(1);
    });

    it('rejects an unknown role before writing', async () => {
      await expect(
        service.updateRole(acme, 'bob', 'OWNER', alice),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.tenantUser.update.mock.calls).toEqual([]);
    });

    it('maps a missing member to not found', async () => {
      prisma.tenantUser.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('No TenantUser found', {
          code: 'P2025',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.updateRole(acme, 'missing', TenantRole.MEMBER, alice),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rethrows other database errors', async () => {
      const error = new Error('connection lost');
      prisma.tenantUser.update.mockRejectedValue(error);

      await expect(
        service.updateRole(acme, 'bob', TenantRole.MEMBER, alice),
      ).rejects.toBe(error);
    });
  });
});

describe('UpdateMemberRoleDto', () => {
  const pipe = new ValidationPipe({ whitelist: true });
  const metadata = {
    type: 'body' as const,
    metatype: UpdateMemberRoleDto,
    data: '',
  };

  it.each([TenantRole.ADMIN, TenantRole.MEMBER])('accepts %s', async (role) => {
    await expect(pipe.transform({ role }, metadata)).resolves.toEqual({
      role,
    });
  });

  it('rejects an unsupported role', async () => {
    await expect(
      pipe.transform({ role: 'OWNER' }, metadata),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a missing role', async () => {
    await expect(pipe.transform({}, metadata)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
