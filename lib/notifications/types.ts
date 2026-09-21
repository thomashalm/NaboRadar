/**
 * Varsling: sync-jobben oppretter rader i `notifications` (status pending).
 * En egen utsending leser pending-rader og sender via en NotificationChannel.
 * Ingen ekte e-post før en leverandør (f.eks. Resend) er konfigurert — inntil da brukes en logg-kanal.
 */
export type NotificationStatus = "pending" | "sent" | "failed" | "skipped";

export interface Notification {
  id: string;
  watchedAreaId: string;
  eventId: string;
  status: NotificationStatus;
  channel: string | null;
  createdAt: string;
  sentAt: string | null;
  error: string | null;
}

export interface NotificationMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface NotificationChannel {
  readonly id: string;
  send(message: NotificationMessage): Promise<{ ok: true } | { ok: false; error: string }>;
}
