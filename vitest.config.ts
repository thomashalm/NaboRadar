import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    /**
     * Databasetestene starter hver sin PGlite i minnet og spiller av hele
     * migrasjonshistorikken — rundt tre sekunder alene, og mer når mange testfiler kjører
     * samtidig og kjemper om CPU-en. Med standardgrensen på 10 s falt enkelte beforeEach
     * ut tilfeldig, ulikt fra kjøring til kjøring, og stadig oftere etter hvert som
     * historikken vokste.
     *
     * Grensen er hevet i stedet for å slå av parallellitet: serialisering fjernet også
     * flakingen, men doblet kjøretiden for hele suiten.
     */
    hookTimeout: 30_000,
  },
});
