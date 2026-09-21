import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-5 pt-[18vh] sm:px-8">
      <h1 className="text-3xl font-semibold tracking-[-0.03em]">Fant ikke siden.</h1>
      <p className="mt-3 text-lg text-muted">Siden finnes ikke, eller er flyttet.</p>
      <Link
        href="/"
        className="mt-8 inline-flex h-12 items-center rounded-full bg-ink px-6 text-[15px] font-medium text-white hover:bg-ink/85"
      >
        Til forsiden
      </Link>
    </main>
  );
}
