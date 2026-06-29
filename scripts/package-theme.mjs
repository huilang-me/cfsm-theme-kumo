/**
 * Builds the Komari theme package:
 *   1. Temporarily removes the dev-only route handler (route handlers can't be
 *      part of a static export)
 *   2. Runs the static export (BUILD_EXPORT=true next build) → out/
 *   3. Verifies the required title/description placeholders survive
 *   4. Assembles theme/ (komari-theme.json + dist/ + preview.png)
 *   5. Zips it into komari-theme-kumo.zip
 *
 * Run with: npm run build:theme
 */
import { execSync } from "node:child_process";
import {
  cpSync,
  rmSync,
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
  createWriteStream,
  statSync,
} from "node:fs";
import { dirname, join } from "node:path";
import archiver from "archiver";

const root = process.cwd();
const p = (...parts) => join(root, ...parts);

const DEV_ROUTES = [
  p("app", "api", "rpc2", "route.ts"),
  p("app", "api", "admin", "theme", "settings", "route.ts"),
];
const OUT = p("out");
const NEXT = p(".next");
const THEME = p("theme");
const DIST = p("theme", "dist");
const ZIP = p("komari-theme-kumo.zip");

const log = (msg) => console.log(`[package-theme] ${msg}`);

// 1. Manifest (version comes from package.json so there's a single source of truth)
const manifest = JSON.parse(readFileSync(p("theme.manifest.json"), "utf8"));
const pkg = JSON.parse(readFileSync(p("package.json"), "utf8"));
manifest.version = process.env.THEME_VERSION || pkg.version;

if (manifest.configuration?.type !== "managed") {
  throw new Error("theme.manifest.json must declare configuration.type = managed");
}
if (!Array.isArray(manifest.configuration.data) || manifest.configuration.data.length === 0) {
  throw new Error("theme.manifest.json must include managed configuration.data");
}

// 2. Stash the dev-only route handlers (incompatible with output: export).
//    We stash by content rather than renaming dirs to avoid Windows
//    file-watcher locks (EPERM on directory rename).
const stashedRoutes = [];
for (const route of DEV_ROUTES) {
  if (!existsSync(route)) continue;
  stashedRoutes.push([route, readFileSync(route, "utf8")]);
  rmSync(route);
}
if (stashedRoutes.length > 0) {
  log(`stashed ${stashedRoutes.length} dev route handler(s)`);
}

function runExport() {
  // A clean .next/out avoids stale static-export artifacts between builds.
  rmSync(NEXT, { recursive: true, force: true });
  rmSync(OUT, { recursive: true, force: true });
  execSync("npx next build", {
    stdio: "inherit",
    env: { ...process.env, BUILD_EXPORT: "true" },
  });
}

try {
  // 3. Static export (retry once on the occasional transient build error)
  log("running static export — BUILD_EXPORT=true next build ...");
  try {
    runExport();
  } catch {
    log("export failed once; cleaning caches and retrying...");
    runExport();
  }
} finally {
  if (stashedRoutes.length > 0) {
    for (const [route, content] of stashedRoutes) {
      mkdirSync(dirname(route), { recursive: true });
      writeFileSync(route, content);
    }
    log("restored dev route handler(s)");
  }
}

// 4. Validate the export
if (!existsSync(join(OUT, "index.html"))) {
  throw new Error("static export failed: out/index.html not found");
}
const html = readFileSync(join(OUT, "index.html"), "utf8");
const required = ["<title>Komari Monitor</title>", "A simple server monitor tool."];
for (const token of required) {
  if (!html.includes(token)) {
    throw new Error(`out/index.html is missing the required placeholder: ${token}`);
  }
}
log("verified required <title> / description placeholders");

// 5. Assemble theme/
rmSync(THEME, { recursive: true, force: true });
mkdirSync(THEME, { recursive: true });
cpSync(OUT, DIST, { recursive: true });
mkdirSync(join(DIST, "assets"), { recursive: true });
writeFileSync(join(THEME, "komari-theme.json"), JSON.stringify(manifest, null, 2));

const previewSrc = p(".preview", "preview.png");
if (existsSync(previewSrc)) {
  cpSync(previewSrc, join(THEME, "preview.png"));
  log("included preview.png");
} else {
  log("note: .preview/preview.png not found — packaging without a preview image");
}
log("assembled theme/ (komari-theme.json + dist/)");

// 6. Zip (komari-theme.json and dist/ at the archive root)
await new Promise((resolve, reject) => {
  const output = createWriteStream(ZIP);
  const archive = archiver("zip", { zlib: { level: 9 } });
  output.on("close", resolve);
  archive.on("error", reject);
  archive.pipe(output);
  archive.directory(THEME, false);
  archive.finalize();
});

const sizeMB = (statSync(ZIP).size / 1024 / 1024).toFixed(2);
log(`done → ${ZIP} (${sizeMB} MB)  short="${manifest.short}"  v${manifest.version}`);
