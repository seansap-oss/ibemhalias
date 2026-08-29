import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { requireCmsAdmin } from "@/lib/supabase/server-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const vaultRoot = path.join(process.cwd(), "IBEMHAL_DATA");
const latestManifest = path.join(
  vaultRoot,
  "exports",
  "LATEST-BACKUP.json"
);

function cloudDisabled() {
  return Boolean(process.env.VERCEL);
}

function readLatest() {
  try {
    return JSON.parse(fs.readFileSync(latestManifest, "utf8"));
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    await requireCmsAdmin();

    return NextResponse.json({
      ok: true,
      localAvailable: !cloudDisabled(),
      vaultPath: vaultRoot,
      databasePath: path.join(vaultRoot, "ibemhal-local.db"),
      latest: readLatest(),
      note: cloudDisabled()
        ? "Local Data Vault runs only on the office/admin PC. Vercel remains the cloud website."
        : "Local Data Vault is available on this PC.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Unable to read Data Vault." },
      { status: Number(error?.status || 500) }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireCmsAdmin();

    if (cloudDisabled()) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Local Data Vault cannot write persistent files on Vercel. Run Backup Now from the office/admin PC.",
        },
        { status: 409 }
      );
    }

    const body = await request.json().catch(() => ({}));
    if (body?.action !== "backup") {
      return NextResponse.json(
        { ok: false, error: "Unknown Data Vault action." },
        { status: 400 }
      );
    }

    const script = path.join(
      process.cwd(),
      "scripts",
      "ibemhal-data-vault.mjs"
    );

    const result = await new Promise<any>((resolve, reject) => {
      const child = spawn(process.execPath, [script], {
        cwd: process.cwd(),
        env: process.env,
        windowsHide: true,
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("error", reject);
      child.on("close", (code) => {
        if (code !== 0) {
          reject(
            new Error(
              stderr.trim() || `Data Vault exited with code ${code}.`
            )
          );
          return;
        }

        try {
          resolve(JSON.parse(stdout.trim()));
        } catch {
          reject(
            new Error(
              `Data Vault returned an invalid result: ${stdout.slice(0, 500)}`
            )
          );
        }
      });
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Local backup failed." },
      { status: Number(error?.status || 500) }
    );
  }
}
