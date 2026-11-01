import "server-only";
import { cacheTag } from "next/cache";
import { redirect } from "next/navigation";
import { apiFetch, type TenantRole } from "./api";
import { getSessionToken } from "./session";

export type Member = {
  id: string;
  name: string;
  email: string;
  role: TenantRole;
  status: "active";
};

export function membersCacheTag(tenantId: string) {
  return `members:${tenantId}`;
}

export async function getMembers(tenantId: string): Promise<Member[]> {
  const token = await getSessionToken();
  if (!token) {
    redirect("/login");
  }
  return fetchMembers(token, tenantId);
}

// Cached per token and tenant so switching tenants stays instant (see AGENTS.md)
async function fetchMembers(token: string, tenantId: string): Promise<Member[]> {
  "use cache";
  cacheTag(membersCacheTag(tenantId));
  const response = await apiFetch("/members", { token, tenantId });
  if (!response.ok) {
    throw new Error(`Failed to load members (${response.status})`);
  }
  return response.json();
}
