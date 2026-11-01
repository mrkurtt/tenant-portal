import { IsIn } from 'class-validator';
import { TenantRole } from '../../generated/prisma/client.js';

export class UpdateMemberRoleDto {
  @IsIn([TenantRole.ADMIN, TenantRole.MEMBER])
  role: string;
}
