import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const roots = ["app", "components", "lib", "supabase"];

const textExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".sql",
  ".css",
]);

const skipRelative = new Set([
  path.normalize("lib/text/clean-display-text.ts"),
  path.normalize("scripts/fix-mojibake-v5_2.mjs"),
]);

const cp = (...values) => String.fromCodePoint(...values);

const replacements = new Map([
  [cp(0x00e2, 0x20ac, 0x00a6), "…"],
  [cp(0x00e2, 0x20ac, 0x201d), "—"],
  [cp(0x00e2, 0x20ac, 0x201c), "–"],
  [cp(0x00e2, 0x20ac, 0x2122), "’"],
  [cp(0x00e2, 0x20ac, 0x02dc), "‘"],
  [cp(0x00e2, 0x20ac, 0x0153), "“"],
  [cp(0x00e2, 0x20ac, 0x009d), "”"],
  [cp(0x00c2, 0x00b7), "·"],
  [cp(0x00c2, 0x00a9), "©"],
  [cp(0x00e2, 0x2020, 0x2019), "→"],
  [cp(0x00e2, 0x2020, 0x0090), "←"],
  [cp(0x00e2, 0x2020, 0x2018), "↑"],
  [cp(0x00e2, 0x2020, 0x201c), "↓"],
  [cp(0x00e2, 0x20ac, 0x00a2), "•"],
  [cp(0x00e2, 0x2014, 0x008f), "●"],
  [cp(0x00e2, 0x0153, 0x201c), "✓"],
  [cp(0x00e2, 0x0153, 0x201d), "✔"],
  [cp(0x00e2, 0x0153, 0x2022), "✕"],
  [cp(0x00e2, 0x0153, 0x2013), "✖"],
  [cp(0x00e2, 0x2030, 0x00a5), "≥"],
  [cp(0x00e2, 0x2030, 0x00a4), "≤"],
  [cp(0x00c3, 0x2014), "×"],
]);

let changedFiles = 0;
let totalReplacements = 0;

function walk(directory) {
  if (!fs.existsSync(directory)) return;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (
      ["node_modules", ".next", ".git", "dist", "build"].includes(
        entry.name
      )
    ) {
      continue;
    }

    const full = path.join(directory, entry.name);
    const relative = path.normalize(path.relative(ROOT, full));

    if (entry.isDirectory()) {
      walk(full);
      continue;
    }

    if (skipRelative.has(relative)) continue;

    if (
      !textExtensions.has(
        path.extname(entry.name).toLowerCase()
      )
    ) {
      continue;
    }

    let text = fs.readFileSync(full, "utf8");
    const original = text;

    for (const [bad, good] of replacements) {
      if (!text.includes(bad)) continue;
      const count = text.split(bad).length - 1;
      totalReplacements += count;
      text = text.split(bad).join(good);
    }

    if (text !== original) {
      fs.writeFileSync(full, text, "utf8");
      changedFiles += 1;
      console.log(
        `  FIXED ${path.relative(ROOT, full)}`
      );
    }
  }
}

for (const root of roots) {
  walk(path.join(ROOT, root));
}

console.log(
  `Mojibake cleanup complete: ${changedFiles} file(s), ${totalReplacements} replacement(s).`
);
