// Extract unique external domains referenced in app code (not docs, tests, or node_modules).
const fs = require("fs");
const path = require("path");

const ROOT = "C:\\unytea";
const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  "dist",
  "build",
  ".git",
  "public", // bundled vendor assets like excalidraw-assets — out of scope
  "docs", // docs reference URLs textually, not loaded at runtime
  "scripts", // tooling
  "tests", // out of runtime path
]);
const EXCLUDED_FILE_EXT = new Set([".md", ".txt", ".log", ".json"]);
const TARGET_EXT = new Set([".ts", ".tsx", ".mjs", ".js", ".cjs"]);

const domains = new Map(); // domain -> Set<string> (sample file:line)

const URL_RE = /https?:\/\/([a-zA-Z0-9._-]+)(?:\:\d+)?(?:\/[^\s"'`)]*)?/g;
const COMMENT_LINE_RE = /^\s*(?:\*|\/\/|<!--)/;

function isExcludedDir(name) {
  return EXCLUDED_DIRS.has(name);
}

function walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (!isExcludedDir(e.name)) walk(path.join(dir, e.name));
    } else if (e.isFile()) {
      const ext = path.extname(e.name).toLowerCase();
      if (!TARGET_EXT.has(ext)) continue;
      if (EXCLUDED_FILE_EXT.has(ext)) continue;
      if (/\.(test|spec)\.(ts|tsx|mjs|js)$/i.test(e.name)) continue;
      const full = path.join(dir, e.name);
      const text = fs.readFileSync(full, "utf8");
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (COMMENT_LINE_RE.test(line)) continue;
        const matches = line.matchAll(URL_RE);
        for (const m of matches) {
          const host = m[1].toLowerCase();
          if (!domains.has(host)) domains.set(host, new Set());
          if (domains.get(host).size < 3) {
            const rel = full.replace(ROOT + "\\", "");
            domains.get(host).add(rel + ":" + (i + 1));
          }
        }
      }
    }
  }
}

walk(ROOT);

const sorted = Array.from(domains.entries()).sort();
console.log("Unique external hostnames (in app code, comments stripped):\n");
for (const [host, samples] of sorted) {
  console.log("  " + host);
  for (const s of samples) console.log("    " + s);
}
console.log("\nTotal unique hostnames:", sorted.length);
