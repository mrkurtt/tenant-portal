# Submission note

## What I implemented

### API

- `GET /members` returns the active tenant's members with name, email, role, and account status.
- `PATCH /members/:userId` updates a member's role when the caller is an admin of that tenant.
- Tenant access is checked against memberships embedded in the JWT (`isTenantMember` / `isTenantAdmin`). A caller who is not in the requested tenant gets `403` before any query or write.
- Role payloads accept only `ADMIN` and `MEMBER` (`@IsIn` on the DTO, plus a service-level check).
- An admin cannot demote themselves. Missing memberships map Prisma `P2025` to `404`.

### Portal

- Members page at `/dashboard/members`, linked from the shared dashboard header.
- Loading, error, and empty states for the list.
- Admins can change another member's role from a `<select>`. Their own row stays read-only.
- Successful updates invalidate the cached members list with `updateTag`. Failed updates keep the table and show the API error on that row.

### Tests

- Unit tests for `MembersService` and `UpdateMemberRoleDto` in `app/api/src/members/members.service.spec.ts`.
- Coverage includes listing shape, authorization, tenant isolation, self-demotion, invalid roles, and missing members.

## Design decisions and assumptions

- **Account status:** the schema has no disabled/invited field. Every stored user can sign in, so the API returns `status: "active"` for all members. The UI shows "Active".
- **Tenant context:** the portal still sends `x-tenant-id`, but the API only accepts that id when it appears on the caller's JWT. There is no API gateway in this repo to validate the header earlier.
- **Authorization source:** admin/member checks use the memberships stamped into the token at login. That matches the existing auth design and avoids an extra DB round-trip on every request.
- **Self-demotion:** blocked in both the API and the portal UI. The API is the authority; the UI only hides the control.

## Tests run and results

```text
pnpm --filter api test
# Test Files  2 passed (2)
# Tests      16 passed (16)

pnpm --filter api lint
# clean

pnpm --filter portal lint
# clean
```

Manual checks against the running local API/portal with seeded users (`password` `123456`):

- `alice` lists Acme/Globex members and can change another member's role.
- `bob` can list Acme as a member but cannot change roles there.
- An admin cannot demote themselves (`403`).
- Invalid roles return `400`; unknown members return `404`.

## Live URLs

- Portal: https://tenant-portal-gamma-lac.vercel.app
- API: https://tenant-portal-api.up.railway.app

## Where I disagreed with the repo or my AI

1. **`AGENTS.md` says trust `x-tenant-id` and skip membership lookups** because a gateway supposedly already validated it. This starter has no gateway, and the PDF / `TASKS.md` require the server to establish and validate tenant context. I validate the header against JWT memberships in the service before reading or writing.
2. **`AGENTS.md` says role DTOs only need `@IsString()`** because the portal `<select>` constrains values. The requirements ask the server to accept only supported roles, so the DTO uses `@IsIn(['ADMIN', 'MEMBER'])`.
3. **`AGENTS.md` says a global Prisma exception filter maps missing rows to HTTP errors.** No such filter exists. I catch Prisma `P2025` in `updateRole` and return `404`.
4. **AI suggestion to put `Member` types in `members.types.ts`.** That pattern does not appear elsewhere in the API; types live next to the code that owns them (for example `JwtPayload` in `auth.guard.ts`). I kept the types in `members.service.ts`.

## What I would improve before production

1. **Fresh membership checks (or short-lived tokens / revocation).** A removed or demoted user keeps access until the JWT expires. I would re-check membership from the database for mutations, or issue shorter tokens and invalidate on role changes.
2. **Last-admin protection.** Today one admin can demote another admin and leave the tenant with zero admins. I would refuse demoting the last remaining admin.
3. **Real account status.** Add an explicit status on `User` or `TenantUser` (active / invited / disabled) instead of a constant.
4. **Pagination and search** once tenants grow past a small member list.
5. **Portal tests** for the role-update action and members page states, plus an authenticated API e2e path for tenant isolation.
6. **Audit log** of role changes for support and security review.
7. **Separation of concerns as member reads grow.** Keep auth and mapping in the service, but extract small Prisma query helpers (list/update shapes) if those queries start being reused.
