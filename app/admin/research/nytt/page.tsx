import type { Metadata } from "next";
import Link from "next/link";
import { getAdminSession } from "@/lib/admin/session";
import { IkkeTilgang } from "@/components/admin/IkkeTilgang";
import { ResearchForm } from "@/components/admin/ResearchForm";

export const metadata: Metadata = { title: "Nytt funn", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Nytt research-funn. Kilder legges til etterpå, på funnets egen side. */
export default async function NyttFunnPage() {
  const session = await getAdminSession();
  if (session.state !== "admin") return <IkkeTilgang tittel="Nytt funn" state={session.state} />;

  return (
    <main className="mx-auto max-w-3xl px-5 pt-10 pb-24 sm:px-8">
      <p className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">Research</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em]">Nytt funn</h1>
      <p className="mt-3 text-[15px] text-muted">
        Et nytt funn er uverifisert og internt til noen har gjort arbeidet. Kilder legges til etter at funnet er
        opprettet.
      </p>
      <ResearchForm />
      <Link href="/admin/research" className="mt-10 inline-block text-[15px] font-medium text-accent hover:underline">
        Til research
      </Link>
    </main>
  );
}
