"use client";

import * as React from "react";
import { UserPlus } from "lucide-react";

type AdminAccount = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
  paused: boolean;
};

export function DirectorAdminManager({ onChanged }: { onChanged?: () => void }) {
  const [accounts, setAccounts] = React.useState<AdminAccount[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [result, setResult] = React.useState("");
  const [resetting, setResetting] = React.useState<AdminAccount | null>(null);
  const [newPassword, setNewPassword] = React.useState("");

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/director/admins", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Unable to load admin accounts.");
      setAccounts(body.accounts || []);
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Unable to load admin accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function createAdmin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult("");
    try {
      const res = await fetch("/api/director/admins", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Unable to create admin.");
      setResult(
        body.temporaryPassword
          ? `Admin created: ${body.email} (Temp password: ${body.temporaryPassword})`
          : `Admin created: ${body.email}. They can now sign in via Portal Login (/login).`
      );
      setName("");
      setEmail("");
      setPassword("");
      await load();
      onChanged?.();
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Unable to create admin.");
    } finally {
      setBusy(false);
    }
  }

  async function togglePause(account: AdminAccount) {
    setBusy(true);
    setResult("");
    try {
      const action = account.paused ? "resume" : "pause";
      const res = await fetch("/api/director/admins", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: account.id, action }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Unable to update admin.");
      setResult(`${account.email} ${body.paused ? "paused" : "resumed"}.`);
      await load();
      onChanged?.();
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Unable to update admin.");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetting) return;
    setBusy(true);
    setResult("");
    try {
      const res = await fetch("/api/director/admins", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: resetting.id, password: newPassword }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Unable to reset password.");
      setResult(`Password updated for ${body.email}.`);
      setResetting(null);
      setNewPassword("");
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Unable to reset password.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAdmin(account: AdminAccount) {
    if (window.prompt(`Type ${account.email} to permanently delete this admin account.`) !== account.email) {
      return;
    }
    setBusy(true);
    setResult("");
    try {
      const res = await fetch("/api/director/admins", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: account.id }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Unable to delete admin.");
      setResult(`Deleted ${account.email}.`);
      await load();
      onChanged?.();
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Unable to delete admin.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border bg-white p-5">
      <h2 className="flex items-center gap-2 text-xl font-bold text-[#14256f]">
        <UserPlus className="h-5 w-5 text-[#c37a26]" />
        Admin Accounts (Create &amp; Manage Staff Admins)
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Create Admin 1, Admin 2, etc. Each admin signs in via Portal Login (`/login`) and is tracked individually.
      </p>

      <form onSubmit={createAdmin} className="mt-4 flex flex-wrap gap-2">
        <input
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Admin Name (e.g. Admin 1)"
          className="rounded-lg border px-3 py-2.5 text-sm"
        />
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin1@ibemhalias.com"
          className="rounded-lg border px-3 py-2.5 text-sm"
        />
        <input
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (min 8 chars)"
          className="rounded-lg border px-3 py-2.5 text-sm"
        />
        <button
          disabled={busy}
          type="submit"
          className="rounded-lg bg-[#14256f] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create Admin"}
        </button>
      </form>

      {result && (
        <p role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-900">
          {result}
        </p>
      )}

      <div className="mt-5 border-t pt-4">
        {loading ? (
          <p className="text-sm text-slate-500">Loading admin accounts…</p>
        ) : accounts.length ? (
          <ul className="divide-y rounded-lg border">
            {accounts.map((acc) => (
              <li key={acc.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                <span className="min-w-36 font-bold text-slate-900">{acc.full_name || "Admin"}</span>
                <span className="text-slate-600">{acc.email}</span>
                {acc.paused && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                    Paused
                  </span>
                )}
                <div className="ml-auto flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setResetting(acc);
                      setNewPassword("");
                    }}
                    className="rounded-lg border px-3 py-1.5 text-xs font-bold"
                  >
                    Reset Password
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void togglePause(acc)}
                    className="rounded-lg border px-3 py-1.5 text-xs font-bold"
                  >
                    {acc.paused ? "Resume" : "Pause"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void deleteAdmin(acc)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No admin accounts created yet.</p>
        )}

        {resetting && (
          <form onSubmit={resetPassword} className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border bg-slate-50 p-4">
            <label className="min-w-60 flex-1 text-sm font-semibold">
              New password for {resetting.email}
              <input
                required
                minLength={8}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1.5 w-full rounded-lg border bg-white p-2.5 text-sm"
              />
            </label>
            <button
              disabled={busy}
              type="submit"
              className="rounded-lg bg-[#14256f] px-4 py-2.5 text-sm font-bold text-white"
            >
              Save Password
            </button>
            <button
              type="button"
              onClick={() => setResetting(null)}
              className="rounded-lg border px-4 py-2.5 text-sm"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
