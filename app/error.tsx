"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app] uventet feil", error.digest ?? error.name);
  }, [error]);

  return (
    <main className="mx-auto max-w-xl px-5 pt-[18vh] sm:px-8">
      <h1 className="text-3xl font-semibold tracking-[-0.03em]">Noe gikk galt.</h1>
      <p className="mt-3 text-lg text-muted">Prøv igjen, eller start et nytt søk.</p>
      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="h-12 rounded-full bg-ink px-6 text-[15px] font-medium text-white hover:bg-ink/85"
        >
          Prøv igjen
        </button>
        <Link href="/" className="flex h-12 items-center rounded-full px-5 text-[15px] font-medium text-accent hover:bg-accent-soft">
          Til forsiden
        </Link>
      </div>
    </main>
  );
}
