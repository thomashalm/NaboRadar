"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Innlogging mot Supabase Auth. Passordet sendes fra nettleseren direkte til Supabase
 * og passerer aldri vår egen server. Admin-brukere opprettes i Supabase-dashbordet.
 */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const client = getSupabaseBrowserClient();
    if (!client) return setError("Supabase er ikke konfigurert.");
    setPending(true);
    setError(null);
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    setPending(false);
    if (signInError) return setError("Feil e-post eller passord.");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-6 flex max-w-sm flex-col gap-3">
      <label className="text-sm font-medium" htmlFor="email">
        E-post
      </label>
      <input
        id="email"
        type="email"
        autoComplete="username"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-11 rounded-xl border border-line bg-surface px-3.5 text-[15px]"
      />
      <label className="text-sm font-medium" htmlFor="password">
        Passord
      </label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="h-11 rounded-xl border border-line bg-surface px-3.5 text-[15px]"
      />
      <button
        type="submit"
        disabled={pending}
        className="mt-2 h-11 rounded-xl bg-ink px-4 text-[15px] font-medium text-white disabled:opacity-50"
      >
        {pending ? "Logger inn …" : "Logg inn"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
