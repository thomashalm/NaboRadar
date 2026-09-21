"use client";

import { useActionState } from "react";
import { syncNowAction, type SyncActionState } from "@/app/dev/actions";

const initial: SyncActionState = { status: "idle" };

export function SyncPanel() {
  const [state, action, pending] = useActionState(syncNowAction, initial);

  return (
    <div className="mt-4">
      <form action={action} className="flex flex-wrap items-center gap-3">
        <select
          name="mode"
          defaultValue="full"
          className="h-11 rounded-full border border-line bg-surface px-4 text-sm"
          aria-label="Sync-modus"
        >
          <option value="full">Full (med reconciliation)</option>
          <option value="incremental">Incremental (oppdateringsdato)</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-full bg-ink px-5 text-sm font-medium text-white hover:bg-ink/85 disabled:opacity-50"
        >
          {pending ? "Synkroniserer …" : "Sync now"}
        </button>
      </form>

      {state.status === "error" && (
        <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.message}</p>
      )}
      {state.status === "done" && (
        <dl className="mt-4 grid grid-cols-[8rem_1fr] gap-y-1 font-mono text-xs">
          {(
            [
              ["Status", state.result.status],
              ["Modus", state.result.mode],
              ["Fetched", state.result.fetched],
              ["Accepted", state.result.accepted],
              ["Rejected", state.result.rejected],
              ["Events", state.result.events],
              ["Documents", state.result.documents],
              ["Inserted", state.result.inserted],
              ["Updated", state.result.updated],
              ["Unchanged", state.result.unchanged],
              ["Removed", state.result.removed],
              ["Failed", state.result.failed],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
          {state.result.errors.length > 0 && (
            <div className="col-span-2 mt-2 text-danger">
              {state.result.errors.slice(0, 5).map((e) => (
                <p key={e}>{e}</p>
              ))}
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
