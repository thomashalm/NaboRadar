"use client";

import { useActionState } from "react";
import { requestSyncAction, type SyncRequestState } from "@/app/admin/actions";
import { beskrivRequest, type SyncRequestLike } from "@/lib/sync/request-state";

const initial: SyncRequestState = { status: "idle" };

/**
 * «Kjør sync nå» / «Kjør full sync». Knappene legger en forespørsel i kø;
 * sync-worker utfører den. Når en forespørsel allerede ligger der, vises den i stedet.
 *
 * Teksten kommer fra `beskrivRequest`, ikke fra rå databasestatus: den som leser driftssiden skal
 * få vite hva som skjer og hvor lenge det har gått, uten å kjenne verdiene `pending` og `running`.
 */
export function SyncButtons({
  providerId,
  supportsIncremental,
  pendingRequest,
  offerForce = false,
}: {
  providerId: string;
  supportsIncremental: boolean;
  pendingRequest: SyncRequestLike | null;
  /** Vises bare når siste kjøring ble stoppet av datafall-vakten. */
  offerForce?: boolean;
}) {
  const [state, action, pending] = useActionState(requestSyncAction, initial);

  if (pendingRequest) {
    const view = beskrivRequest(pendingRequest);
    return (
      <div className={`text-[13px] ${view.varsler ? "text-danger" : "text-muted"}`}>
        <p className="font-medium">{view.tittel}</p>
        <p>{view.detalj}</p>
      </div>
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
