"use client";

import { useActionState, useEffect, useRef } from "react";
import type { TenantRole } from "@/lib/api";
import {
  updateMemberRole,
  type UpdateMemberRoleState,
} from "./actions";

const selectClass =
  "rounded-md border border-zinc-300 bg-white py-1.5 pl-2 pr-8 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900";

export function RoleSelect({
  tenantId,
  memberId,
  role,
}: {
  tenantId: string;
  memberId: string;
  role: TenantRole;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<
    UpdateMemberRoleState,
    FormData
  >(updateMemberRole, {});

  // A failed change leaves the select on the attempted value; put it back.
  useEffect(() => {
    if (state.error && state.memberId === memberId) {
      formRef.current?.reset();
    }
  }, [state, memberId]);

  return (
    <div className="space-y-1">
      <form ref={formRef} action={action} className="flex items-center gap-2">
        <input type="hidden" name="tenantId" value={tenantId} />
        <input type="hidden" name="memberId" value={memberId} />
        <label className="sr-only" htmlFor={`role-${memberId}`}>
          Role
        </label>
        <select
          key={role}
          id={`role-${memberId}`}
          name="role"
          defaultValue={role}
          disabled={pending}
          onChange={() => formRef.current?.requestSubmit()}
          className={selectClass}
        >
          <option value="ADMIN">Admin</option>
          <option value="MEMBER">Member</option>
        </select>
        {pending && <span className="text-xs text-zinc-500">Saving…</span>}
      </form>
      {state.error && state.memberId === memberId && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
    </div>
  );
}
