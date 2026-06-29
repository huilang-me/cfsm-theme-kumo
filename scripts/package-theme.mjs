/**
 * Static export with dev-only route removal.
 * Route handlers can't be part of a static export, so we temporarily
 * remove them, build, then restore.
 *
 * Environment variables (all optional, override public/config.json):
 *   API_BASE          — comma-separated backend URLs
 *   TITLE             — site title
 *   BACKGROUND_IMAGE  — background image URL
 */
import { execSync } from "node:child_process";
import {
  rmSync,
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const p = (...parts) => join(root, ...parts);

const DEV_ROUTES = [
  p("app", "api", "rpc2", "route.ts"),
  p("app", "api", "admin", "theme", "settings", "route.ts"),
];
const CONFIG_PATH = p("public", "config.json");
const OUT = p("out");
const NEXT = p(".next");

const log = (msg) => console.log(`[export] ${msg}`);

// Stash dev route handlers
const stashedRoutes = [];
for (const route of DEV_ROUTES) {
  if (!existsSync(route)) continue;
  stashedRoutes.push([route, readFileSync(route, "utf8")]);
  rmSync(route);
}
if (stashedRoutes.length > 0) {
  log(`stashed ${stashedRoutes.length} dev route handler(s)`);
}

// Generate config.json from env vars if any are set
let originalConfig = null;
const apiBase = process.env.API_BASE;
const title = process.env.TITLE;
const backgroundImage = process.env.BACKGROUND_IMAGE;
if (apiBase || title || backgroundImage) {
  if (existsSync(CONFIG_PATH)) {
    originalConfig = readFileSync(CONFIG_PATH, "utf8");
  }
  const config = originalConfig ? JSON.parse(originalConfig) : {};
  if (apiBase) config.apiBase = apiBase.split(",").map((s) => s.trim());
  if (title) config.title = title;
  if (backgroundImage) config.backgroundImage = backgroundImage;
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
  log("generated config.json from environment variables");
}

function runExport() {
  rmSync(NEXT, { recursive: true, force: true });
  rmSync(OUT, { recursive: true, force: true });
  execSync("npx next build", {
    stdio: "inherit",
    env: { ...process.env, BUILD_EXPORT: "true" },
  });
}

try {
  log("running static export ...");
  try {
    runExport();
  } catch {
    log("export failed once; cleaning caches and retrying...");
    runExport();
  }
} finally {
  for (const [route, content] of stashedRoutes) {
    mkdirSync(dirname(route), { recursive: true });
    writeFileSync(route, content);
  }
  if (stashedRoutes.length > 0) {
    log("restored dev route handler(s)");
  }
  if (originalConfig !== null) {
    writeFileSync(CONFIG_PATH, originalConfig);
    log("restored original config.json");
  }
}

if (!existsSync(join(OUT, "index.html"))) {
  throw new Error("static export failed: out/index.html not found");
}
log("done → out/");
