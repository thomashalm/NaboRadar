"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/** Det brukeren gjør når hun tar over selv. Da slutter vi å holde målet på plass. */
const BRUKERHANDLINGER = ["wheel", "touchstart", "pointerdown", "keydown"] as const;

/**
 * Et stabilt anker på resultatsiden: `#tilfluktsrom`, `#skolekrets`.
 *
 * Nettleserens egen ankerhopping holder ikke her. Målet finnes ikke i HTML-en når siden åpnes —
 * seksjonene strømmer inn etter hvert som kildene svarer — og seksjonene over fylles inn i
 * opptil fem sekunder etterpå og skyver målet nedover.
 *
 * Derfor lander komponenten selv, og gjør det når den monteres: da finnes målet per definisjon,
 * og dataene er lastet. Det er ingen tidsfrist som må treffe. Mens resten av siden laster,
 * holdes målet på plass av en ResizeObserver, uten animasjon, så det ses som én landing og ikke
 * som flere hopp. Første gang brukeren ruller, trykker eller taster, slipper vi taket.
 *
 * Er målet sammenleggbart, åpnes akkurat det — ingen andre grupper på siden.
 *
 * Uten anker i URL-en gjør komponenten ingenting. Søk fra forsiden lander øverst som før.
 */
export function DeepLinkTarget({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Navigasjon innen siden (ny radius, «Finn nærmeste …», tilbake/fram) monterer ikke målet på
  // nytt og utløser ikke hashchange. Søkestrengen er det som faktisk endrer seg.
  const search = useSearchParams().toString();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let observer: ResizeObserver | null = null;

    const slipp = () => {
      observer?.disconnect();
      observer = null;
      for (const type of BRUKERHANDLINGER) window.removeEventListener(type, slipp);
    };

    const land = () => {
      slipp();
      if (window.location.hash !== `#${id}`) return;
      element.querySelector("details")?.setAttribute("open", "");
      element.scrollIntoView({ block: "start" });
      observer = new ResizeObserver(() => element.scrollIntoView({ block: "start" }));
      observer.observe(document.body);
      for (const type of BRUKERHANDLINGER) window.addEventListener(type, slipp, { passive: true });
    };

    land();
    window.addEventListener("hashchange", land);
    return () => {
      slipp();
      window.removeEventListener("hashchange", land);
    };
  }, [id, search]);

  return (
    // scroll-mt: topplinjen er 4rem og ligger fast. Målet skal stå under den, med litt luft.
    <div ref={ref} id={id} className={`scroll-mt-20 ${className ?? ""}`}>
      {children}
    </div>
  );
}
