"use client";

export default function MembersError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const message =
    error instanceof Error ? error.message : "Something went wrong.";

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-lg font-semibold">Couldn&apos;t load members</h1>
          <p className="mt-1 text-sm text-zinc-500">{message}</p>
          <button
            type="button"
            onClick={() => retry()}
            className="mt-4 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Try again
          </button>
        </div>
      </main>
    </div>
  );
}
