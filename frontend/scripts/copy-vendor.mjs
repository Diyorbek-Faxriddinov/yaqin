// MapLibre 6 web worker'ni public/vendor ga ko'chiradi (dev va build oldidan avtomatik).
// Worker bundle'dan tashqarida, versiya nomi bilan beriladi — bundler nisbiy yo'lni buzmasligi
// va brauzer keshi versiya almashganda yangilanishi uchun. Qarang: src/features/map/maplibre.ts
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const pkgPath = require.resolve("maplibre-gl/package.json");
const { version } = JSON.parse(readFileSync(pkgPath, "utf8"));
const source = path.join(path.dirname(pkgPath), "dist", "maplibre-gl-worker.mjs");
const targetDir = path.join(import.meta.dirname, "..", "public", "vendor");

mkdirSync(targetDir, { recursive: true });
copyFileSync(source, path.join(targetDir, `maplibre-gl-worker-${version}.mjs`));
console.log(`maplibre-gl worker ${version} → public/vendor`);
