"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignOutButton({ email }: { email: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <div className="flex items-center gap-3 text-sm text-muted">
      <span>{email}</span>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          await getSupabaseBrowserClient()?.auth.signOut();
          router.refresh();
        }}
        className="h-9 rounded-lg border border-line px-3 font-medium text-ink disabled:opacity-50"
      >
        Logg ut
      </button>
    </div>
  );
}
