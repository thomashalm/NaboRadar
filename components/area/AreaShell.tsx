import { SiteHeader } from "@/components/site/SiteHeader";

/** Felles ramme for /omrade og undersidene: topplinjen, så innhold. Høyden (4rem) brukes av sticky-kartet. */
export function AreaShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1">
      <SiteHeader sticky />
      {children}
    </div>
  );
}
