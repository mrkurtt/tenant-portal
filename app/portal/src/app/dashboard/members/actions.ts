"use server";

import { updateTag } from "next/cache";
import { apiFetch, type TenantRole } from "@/lib/api";
import { membersCacheTag } from "@/lib/members";
import { getSessionToken } from "@/lib/session";

export type UpdateMemberRoleState = {
  error?: string;
  memberId?: string;
};

function apiMessage(body: unknown, fallback: string) {
  if (!body || typeof body !== "object") {
    return fallback;
  }
  const message = (body as { message?: unknown }).message;
  if (typeof message === "string" && message.trim()) {
    return message;
  }
  if (Array.isArray(message) && message.length > 0) {
    return message.map(String).join(" ");
  }
  return fallback;
}

export async function updateMemberRole(
  _state: UpdateMemberRoleState,
  formData: FormData,
): Promise<UpdateMemberRoleState> {
  const tenantId = String(formData.get("tenantId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  const role = String(formData.get("role") ?? "") as TenantRole;

  if (!tenantId || !memberId) {
    return { error: "Missing member details.", memberId };
  }
  if (role !== "ADMIN" && role !== "MEMBER") {
    return { error: "Role must be Admin or Member.", memberId };
  }

  const token = await getSessionToken();
  if (!token) {
    return { error: "Your session expired. Sign in again.", memberId };
  }

  let response: Response;
  try {
    response = await apiFetch(`/members/${memberId}`, {
      token,
      tenantId,
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  } catch {
    return { error: "Can't reach the API. Is it running?", memberId };
  }

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    return {
      error: apiMessage(body, `Failed to update role (${response.status})`),
      memberId,
    };
  }

  updateTag(membersCacheTag(tenantId));
  return { memberId };
}
