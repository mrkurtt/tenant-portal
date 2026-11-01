import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "../actions";
import type { CurrentUser, Tenant } from "@/lib/api";
import { TenantSwitcher } from "./tenant-switcher";

export function DashboardHeader({
  user,
  tenant,
  active,
}: {
  user: CurrentUser;
  tenant?: Tenant;
  active: "dashboard" | "members";
}) {
  const tenantQuery = tenant ? `?tenant=${tenant.slug}` : "";

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={`/dashboard${tenantQuery}`}
            className="flex size-8 items-center justify-center rounded-md bg-indigo-600 text-sm font-semibold text-white"
            aria-label="Dashboard"
          >
            T
          </Link>
          {tenant && (
            <TenantSwitcher tenants={user.tenants} activeSlug={tenant.slug} />
          )}
          <nav className="flex items-center gap-1 text-sm">
            <NavLink
              href={`/dashboard${tenantQuery}`}
              active={active === "dashboard"}
            >
              Dashboard
            </NavLink>
            <NavLink
              href={`/dashboard/members${tenantQuery}`}
              active={active === "members"}
            >
              Members
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">
            {user.name}{" "}
            <span className="text-zinc-400">@{user.username}</span>
          </span>
          <form action={logout}>
            <button className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-md px-2.5 py-1.5 font-medium ${
        active
          ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
      }`}
    >
      {children}
    </Link>
  );
}
