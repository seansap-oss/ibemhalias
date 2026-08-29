"use client";

import * as React from "react";
import {
  CheckCircle2,
  Copy,
  DatabaseBackup,
  HardDrive,
  Loader2,
  ShieldCheck,
} from "lucide-react";

export function DataVaultPanel() {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/data-vault", {
        cache: "no-store",
      });
      const next = await response.json();
      if (!response.ok || !next.ok) {
        throw new Error(next.error || "Unable to load Data Vault.");
      }
      setData(next);
    } catch (error: any) {
      setMessage(error?.message || "Unable to load Data Vault.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function backup() {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/data-vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "backup" }),
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Backup failed.");
      }

      setMessage("Local database backup completed.");
      await load();
    } catch (error: any) {
      setMessage(error?.message || "Backup failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="grid min-h-[45vh] place-items-center">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
      </div>
    );
  }

  const counts = data?.latest?.counts || {};

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.17em] text-[#3155c6]">
          Ibemhal Local Backup
        </div>
        <h1 className="mt-1 text-2xl font-black">Local Data Vault</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
          A local SQLite copy of students, teachers, courses, attendance, class
          records and CRM data. Supabase remains the primary online database.
        </p>
      </div>

      {message ? (
        <div className="flex items-center gap-2 rounded-2xl bg-blue-50 p-4 text-xs font-bold text-blue-800">
          <CheckCircle2 className="h-4 w-4" />
          {message}
        </div>
      ) : null}

      {!data?.localAvailable ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <div className="font-black">
            Local backup is intentionally disabled on Vercel
          </div>
          <p className="mt-1 text-xs leading-5">
            Open this page from the office/admin PC using localhost to create
            persistent local backups.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-3">
            <DatabaseBackup className="h-6 w-6 text-[#3155c6]" />
            <div>
              <h2 className="font-black">Backup Status</h2>
              <p className="text-[10px] text-slate-400">
                SQLite database plus timestamped JSON snapshots.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Students / Profiles", counts.profiles || 0],
              ["Teachers", counts.teacher_profiles || 0],
              ["Courses", counts.courses || 0],
              ["Attendance", counts.live_class_attendance || 0],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-2xl bg-slate-50 p-4"
              >
                <div className="text-2xl font-black text-[#102968]">
                  {String(value)}
                </div>
                <div className="mt-1 text-[10px] font-bold text-slate-400">
                  {label}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
              Last backup
            </div>
            <div className="mt-2 text-sm font-black">
              {data?.latest?.createdAt
                ? new Date(data.latest.createdAt).toLocaleString()
                : "No local backup yet"}
            </div>
            {data?.latest?.backupFolder ? (
              <div className="mt-1 break-all text-[10px] text-slate-400">
                {data.latest.backupFolder}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={backup}
            disabled={busy || !data?.localAvailable}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#3155c6] px-5 text-xs font-black text-white disabled:opacity-40"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <DatabaseBackup className="h-4 w-4" />
            )}
            Backup Now
          </button>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <HardDrive className="h-6 w-6 text-[#3155c6]" />
          <h2 className="mt-4 font-black">Local Storage</h2>

          <div className="mt-4 space-y-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-[10px] font-black uppercase text-slate-400">
                Vault folder
              </div>
              <div className="mt-2 break-all text-[11px] font-bold">
                {data?.vaultPath || "IBEMHAL_DATA"}
              </div>
              <button
                type="button"
                onClick={() =>
                  navigator.clipboard
                    .writeText(data?.vaultPath || "")
                    .catch(() => undefined)
                }
                className="mt-3 inline-flex items-center gap-2 text-[10px] font-black text-indigo-600"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy path
              </button>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-[10px] font-black uppercase text-slate-400">
                SQLite database
              </div>
              <div className="mt-2 break-all text-[11px] font-bold">
                {data?.databasePath || "ibemhal-local.db"}
              </div>
            </div>
          </div>

          <div className="mt-5 flex gap-3 rounded-2xl bg-emerald-50 p-4 text-xs leading-5 text-emerald-800">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            Runtime local backup data is excluded from GitHub.
          </div>
        </div>
      </div>
    </div>
  );
}
