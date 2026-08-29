import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const vaultRoot = path.join(root, "IBEMHAL_DATA");
const backupsRoot = path.join(vaultRoot, "backups");
const exportsRoot = path.join(vaultRoot, "exports");
const dbPath = path.join(vaultRoot, "ibemhal-local.db");

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf8");

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    value = value.replace(/^["']|["']$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

const supabaseUrl = String(
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_API_BASE_URL ||
    ""
).trim();
const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

if (!supabaseUrl || !serviceKey) {
  throw new Error(
    "Local Data Vault needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local."
  );
}

fs.mkdirSync(backupsRoot, { recursive: true });
fs.mkdirSync(exportsRoot, { recursive: true });

const now = new Date();
const stamp = now
  .toISOString()
  .replace(/[:.]/g, "-")
  .replace("T", "_")
  .replace("Z", "");

const runId = `backup-${stamp}`;
const runFolder = path.join(backupsRoot, stamp);
fs.mkdirSync(runFolder, { recursive: true });

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const tables = [
  "profiles",
  "courses",
  "modules",
  "lessons",
  "enrollments",
  "lesson_progress",
  "live_classes",
  "live_class_course_access",
  "live_class_assignments",
  "live_class_attendance",
  "live_class_resources",
  "teacher_profiles",
  "teacher_permissions",
  "teacher_notes",
  "teacher_activity_log",
];

const db = new DatabaseSync(dbPath);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS backup_runs (
    run_id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL,
    counts_json TEXT NOT NULL,
    folder_path TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS backup_records (
    run_id TEXT NOT NULL,
    entity TEXT NOT NULL,
    record_id TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    PRIMARY KEY (run_id, entity, record_id)
  );
  CREATE INDEX IF NOT EXISTS idx_backup_records_entity
    ON backup_records(entity, run_id);
`);

const insertRecord = db.prepare(`
  INSERT OR REPLACE INTO backup_records
    (run_id, entity, record_id, payload_json)
  VALUES (?, ?, ?, ?)
`);

const insertRun = db.prepare(`
  INSERT OR REPLACE INTO backup_runs
    (run_id, created_at, status, counts_json, folder_path)
  VALUES (?, ?, ?, ?, ?)
`);

async function fetchAll(table) {
  const rows = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(from, from + pageSize - 1);

    if (error) {
      const text = String(error.message || error);
      if (
        text.toLowerCase().includes("does not exist") ||
        text.toLowerCase().includes("schema cache")
      ) {
        return { rows: [], skipped: true, error: text };
      }
      throw error;
    }

    const page = data || [];
    rows.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }

  return { rows, skipped: false, error: null };
}

const counts = {};
const skipped = {};

db.exec("BEGIN");
try {
  for (const table of tables) {
    const result = await fetchAll(table);
    const rows = result.rows;

    counts[table] = rows.length;
    if (result.skipped) skipped[table] = result.error;

    fs.writeFileSync(
      path.join(runFolder, `${table}.json`),
      JSON.stringify(rows, null, 2),
      "utf8"
    );

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const recordId = String(
        row.id ||
          row.teacher_id ||
          row.user_id ||
          row.key ||
          `${table}-${index}`
      );

      insertRecord.run(
        runId,
        table,
        recordId,
        JSON.stringify(row)
      );
    }
  }

  insertRun.run(
    runId,
    now.toISOString(),
    "completed",
    JSON.stringify({ counts, skipped }),
    runFolder
  );
  db.exec("COMMIT");
} catch (error) {
  db.exec("ROLLBACK");
  throw error;
} finally {
  db.close();
}

const manifest = {
  runId,
  createdAt: now.toISOString(),
  database: dbPath,
  backupFolder: runFolder,
  counts,
  skipped,
};

fs.writeFileSync(
  path.join(runFolder, "manifest.json"),
  JSON.stringify(manifest, null, 2),
  "utf8"
);

fs.writeFileSync(
  path.join(exportsRoot, "LATEST-BACKUP.json"),
  JSON.stringify(manifest, null, 2),
  "utf8"
);

process.stdout.write(JSON.stringify({ ok: true, ...manifest }));
