import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP_DIR = join(root, "app");
const API_DIR = join(APP_DIR, "api");
const STASH = join(root, ".api-stash");
const DYN_STASH = join(root, ".dyn-stash");
const DYN_MANIFEST = join(DYN_STASH, "manifest.json");

const mode = process.argv[2];

function rmRetry(target, attempts = 8) {
  for (let i = 0; i < attempts; i++) {
    try {
      rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      if (!existsSync(target)) return true;
    } catch {
      // retry
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  }
  return !existsSync(target);
}

function findDynamicDirs(dir, found = []) {
  if (!existsSync(dir)) return found;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = join(dir, entry.name);
    if (full === API_DIR) continue;
    if (entry.name.includes("[")) {
      found.push(full);
    } else {
      findDynamicDirs(full, found);
    }
  }
  return found;
}

if (mode === "stash") {
  if (existsSync(API_DIR)) {
    rmRetry(STASH);
    cpSync(API_DIR, STASH, { recursive: true });
    if (!rmRetry(API_DIR)) {
      console.error("Could not remove app/api — close editors/OneDrive sync and retry.");
      process.exit(1);
    }
    console.log("API routes stashed for static export");
  } else {
    console.log("No app/api directory — nothing to stash");
  }

  const dynDirs = findDynamicDirs(APP_DIR);
  rmRetry(DYN_STASH);
  if (dynDirs.length > 0) {
    mkdirSync(DYN_STASH, { recursive: true });
    const manifest = [];
    dynDirs.forEach((absPath, idx) => {
      const rel = relative(root, absPath);
      const slot = `slot_${idx}`;
      cpSync(absPath, join(DYN_STASH, slot), { recursive: true });
      rmRetry(absPath);
      manifest.push({ rel, slot });
    });
    writeFileSync(DYN_MANIFEST, JSON.stringify(manifest, null, 2));
    console.log(`Stashed ${manifest.length} dynamic route folders for static export`);
  }
} else if (mode === "restore") {
  if (existsSync(STASH)) {
    rmRetry(API_DIR);
    cpSync(STASH, API_DIR, { recursive: true });
    rmRetry(STASH);
    console.log("API routes restored");
  } else {
    console.log("No stash present — nothing to restore");
  }

  if (existsSync(DYN_MANIFEST)) {
    const manifest = JSON.parse(readFileSync(DYN_MANIFEST, "utf8"));
    for (const item of manifest) {
      const dest = join(root, item.rel);
      const src = join(DYN_STASH, item.slot);
      if (existsSync(src)) {
        rmRetry(dest);
        cpSync(src, dest, { recursive: true });
      }
    }
    rmRetry(DYN_STASH);
    console.log(`Restored ${manifest.length} dynamic route folders`);
  }
} else {
  console.error("Usage: node scripts/prepare-static.mjs <stash|restore>");
  process.exit(1);
}
