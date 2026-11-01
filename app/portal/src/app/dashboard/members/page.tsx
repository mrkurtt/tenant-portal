import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentUser, type CurrentUser, type Tenant } from "@/lib/api";
import { getMembers, type Member } from "@/lib/members";
import { DashboardHeader } from "../header";
import { RoleSelect } from "./role-select";

export const metadata: Metadata = { title: "Members · Tenant Portal" };

const card =
  "rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900";

export default function MembersPage({
  searchParams,
}: PageProps<"/dashboard/members">) {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <Suspense fallback={<MembersPageSkeleton />}>
        <Members searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Members({
  searchParams,
}: Pick<PageProps<"/dashboard/members">, "searchParams">) {
  const [user, { tenant: slug }] = await Promise.all([
    getCurrentUser(),
    searchParams,
  ]);
  const tenant =
    user.tenants.find((t) => t.slug === slug) ?? user.tenants[0];

  return (
    <>
      <DashboardHeader user={user} tenant={tenant} active="members" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {tenant ? (
          <Suspense fallback={<MembersTableSkeleton />}>
            <MembersPanel user={user} tenant={tenant} />
          </Suspense>
        ) : (
          <div className={card}>
            <h1 className="text-lg font-semibold">No tenants yet</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Ask an admin to add you to a tenant.
            </p>
          </div>
        )}
      </main>
    </>
  );
}

async function MembersPanel({
  user,
  tenant,
}: {
  user: CurrentUser;
  tenant: Tenant;
}) {
  const members = await getMembers(tenant.id);
  const isAdmin = tenant.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          People in {tenant.name}
          {isAdmin ? ". As an admin, you can change roles." : "."}
        </p>
      </div>

      {members.length === 0 ? (
        <div className={card}>
          <h2 className="font-semibold">No members yet</h2>
          <p className="mt-1 text-sm text-zinc-500">
            This organization does not have any members.
          </p>
        </div>
      ) : (
        <div className={`${card} overflow-x-auto p-0`}>
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Account status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  tenantId={tenant.id}
                  currentUserId={user.id}
                  canEditRoles={isAdmin}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MemberRow({
  member,
  tenantId,
  currentUserId,
  canEditRoles,
}: {
  member: Member;
  tenantId: string;
  currentUserId: string;
  canEditRoles: boolean;
}) {
  const isSelf = member.id === currentUserId;
  const showRoleSelect = canEditRoles && !isSelf;

  return (
    <tr>
      <td className="px-5 py-3 font-medium">{member.name}</td>
      <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">
        {member.email}
      </td>
      <td className="px-5 py-3">
        {showRoleSelect ? (
          <RoleSelect
            tenantId={tenantId}
            memberId={member.id}
            role={member.role}
          />
        ) : (
          <div className="space-y-1">
            <span>{roleLabel(member.role)}</span>
            {canEditRoles && isSelf && (
              <p className="text-xs text-zinc-500">
                You can&apos;t remove your own admin access.
              </p>
            )}
          </div>
        )}
      </td>
      <td className="px-5 py-3">
        <StatusBadge status={member.status} />
      </td>
    </tr>
  );
}

function roleLabel(role: Member["role"]) {
  return role === "ADMIN" ? "Admin" : "Member";
}

function StatusBadge({ status }: { status: Member["status"] }) {
  return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
      {status === "active" ? "Active" : status}
    </span>
  );
}

function MembersTableSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-64 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="h-72 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

function MembersPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl animate-pulse space-y-6 px-4 py-8">
      <div className="h-8 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-4 w-64 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-72 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}
