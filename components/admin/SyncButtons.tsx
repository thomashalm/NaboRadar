"use client";

import { useActionState } from "react";
import { requestSyncAction, type SyncRequestState } from "@/app/admin/actions";

const initial: SyncRequestState = { status: "idle" };

/**
 * «Kjør sync nå» / «Kjør full sync». Knappene legger en forespørsel i kø;
 * sync-worker utfører den. Når en forespørsel allerede ligger der, vises den i stedet.
 */
export function SyncButtons({
  providerId,
  supportsIncremental,
  pendingRequest,
  offerForce = false,
}: {
  providerId: string;
  supportsIncremental: boolean;
  pendingRequest: { mode: string; status: string } | null;
  /** Vises bare når siste kjøring ble stoppet av datafall-vakten. */
  offerForce?: boolean;
}) {
  const [state, action, pending] = useActionState(requestSyncAction, initial);

  if (pendingRequest) {
    return (
      <p className="text-[13px] text-muted">
        {pendingRequest.status === "running" ? "Kjører nå" : "Ligger i kø"} ({pendingRequest.mode})
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="providerId" value={providerId} />
      {supportsIncremental && (
        <button
          type="submit"
          name="mode"
          value="incremental"
          disabled={pending}
          className="h-9 rounded-lg border border-line px-3 text-[13px] font-medium disabled:opacity-50"
        >
          Kjør sync nå
        </button>
      )}
      <button
        type="submit"
        name="mode"
        value="full"
        disabled={pending}
        className="h-9 rounded-lg border border-line px-3 text-[13px] font-medium disabled:opacity-50"
      >
        Kjør full sync
      </button>
      {offerForce && (
        <button
          type="submit"
          name="force"
          value="1"
          disabled={pending}
          className="h-9 rounded-lg border border-danger px-3 text-[13px] font-medium text-danger disabled:opacity-50"
          title="Kjører full sync og markerer poster som ikke finnes i kilden som fjernet, selv om antallet falt unormalt mye."
        >
          Full sync og godta datafallet
        </button>
      )}
      {state.status !== "idle" && (
        <span className={`text-[13px] ${state.status === "error" ? "text-danger" : "text-muted"}`}>{state.message}</span>
      )}
    </form>
  );
}
