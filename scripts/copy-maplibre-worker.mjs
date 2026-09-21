// MapLibre GL 6 laster web workeren fra en fil ved siden av sin egen modul (import.meta.url).
// Bundleren kopierer ikke den fila, så vi serverer worker + delt modul fra public/ med versjonert sti.
// Kjøres automatisk av postinstall, predev og prebuild.
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const pkgPath = require.resolve("maplibre-gl/package.json");
const { version } = JSON.parse(readFileSync(pkgPath, "utf8"));
const dist = join(dirname(pkgPath), "dist");
const target = join(process.cwd(), "public", "vendor", `maplibre-gl-${version}`);

mkdirSync(target, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(join(dist, file), join(target, file));
}
console.log(`maplibre-gl ${version}: worker kopiert til public/vendor/`);
