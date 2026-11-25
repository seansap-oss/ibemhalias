"use client";

import * as React from "react";

type StaffAccount = { id: string; email: string; full_name: string | null; role: string; created_at: string; paused: boolean };

export function DirectorCreate() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState("director");
  const [result, setResult] = React.useState("");
  const [accounts, setAccounts] = React.useState<StaffAccount[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [createPassword, setCreatePassword] = React.useState("");
  const [editing, setEditing] = React.useState<StaffAccount | null>(null);
  const [resetting, setResetting] = React.useState<StaffAccount | null>(null);
  const [newPassword, setNewPassword] = React.useState("");

  const load = React.useCallback(async () => {
    try {
      const response = await fetch("/api/owner/director", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load staff accounts.");
      setAccounts(body.accounts || []);
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Unable to load staff accounts.");
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setResult("");
    try {
      const response = await fetch("/api/owner/director", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, role, password: createPassword }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to create staff account.");
      setResult(body.temporaryPassword ? `Staff account created: ${body.email}. Temporary password: ${body.temporaryPassword}. Save it privately; it will not be shown again.` : `Staff account created: ${body.email}.`);
      setName("");
      setEmail("");
      setCreatePassword("");
      await load();
    } catch (error) { setResult(error instanceof Error ? error.message : "Unable to create staff account."); }
    finally { setBusy(false); }
  }

  async function resetPassword(event: React.FormEvent) {
    event.preventDefault();
    if (!resetting) return;
    setBusy(true);
    setResult("");
    try {
      const response = await fetch("/api/owner/director", {
        method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: resetting.id, password: newPassword }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to reset password.");
      setResult(`Password updated for ${body.email}.`);
      setResetting(null);
      setNewPassword("");
    } catch (error) { setResult(error instanceof Error ? error.message : "Unable to reset password."); }
    finally { setBusy(false); }
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true); setResult("");
    try {
      const response = await fetch("/api/owner/director", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: editing.id, name: editing.full_name, email: editing.email, role: editing.role }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to update account.");
      setResult(`Account updated: ${body.email}.`);
      setEditing(null);
      await load();
    } catch (error) { setResult(error instanceof Error ? error.message : "Unable to update account."); }
    finally { setBusy(false); }
  }

  async function deleteAccount(account: StaffAccount) {
    if (window.prompt(`Type ${account.email} to permanently delete this account and its login.`) !== account.email) return;
    setBusy(true); setResult("");
    try {
      const response = await fetch("/api/owner/director", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: account.id }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to delete account.");
      setResult(`Deleted ${account.email}.`);
      setEditing(null); setResetting(null);
      await load();
    } catch (error) { setResult(error instanceof Error ? error.message : "Unable to delete account."); }
    finally { setBusy(false); }
  }

  async function togglePause(account: StaffAccount) {
    setBusy(true); setResult("");
    try {
      const action = account.paused ? "resume" : "pause";
      const response = await fetch("/api/owner/director", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: account.id, action }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to change account access.");
      setResult(`${account.email} ${body.paused ? "paused" : "resumed"}.`);
      await load();
    } catch (error) { setResult(error instanceof Error ? error.message : "Unable to change account access."); }
    finally { setBusy(false); }
  }

  return <section className="rounded-2xl border bg-white p-5">
    <h2 className="text-lg font-bold">Named staff accounts (Director &amp; Admin)</h2>
    <p className="mt-1 text-sm text-slate-500">Only Super Admin creates named Director and Admin logins. Directors sign in directly from the normal <span className="font-semibold text-slate-800">Portal Login (/login)</span>.</p>
    <form onSubmit={create} className="mt-4 flex flex-wrap gap-2">
      <input required minLength={2} aria-label="Staff full name" value={name} onChange={event => setName(event.target.value)} placeholder="Full name (e.g. Director)" className="rounded-lg border p-3" />
      <input required aria-label="Staff email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="e.g. director@ibemhalias.com" className="rounded-lg border p-3" />
      <select aria-label="Staff role" value={role} onChange={event => setRole(event.target.value)} className="rounded-lg border p-3"><option value="director">Director</option><option value="admin">Admin</option></select>
      <input aria-label="New staff password" type="password" autoComplete="new-password" minLength={8} value={createPassword} onChange={event => setCreatePassword(event.target.value)} placeholder="Password (optional)" className="rounded-lg border p-3" />
      <button disabled={busy} type="submit" className="rounded-lg bg-[#202b70] px-4 py-2 font-bold text-white disabled:opacity-50">{busy ? "Creating…" : "Create staff account"}</button>
    </form>
    {result && <p role="status" className="mt-3 break-words rounded-lg bg-amber-50 p-3 text-sm">{result}</p>}
    <div className="mt-6 border-t pt-5">
      <div className="flex items-center justify-between gap-3"><h3 className="font-bold">Existing accounts</h3><button type="button" onClick={() => void load()} className="rounded-lg border px-3 py-2 text-sm font-semibold">Refresh</button></div>
      {loading ? <p className="mt-3 text-sm text-slate-500">Loading accounts…</p> : accounts.length ? <ul className="mt-3 divide-y rounded-lg border">{accounts.map(account => <li key={account.id} className="flex flex-wrap items-center gap-x-5 gap-y-1 p-3 text-sm"><span className="min-w-36 font-semibold">{account.full_name || "Unnamed staff"}</span><span className="break-all text-slate-600">{account.email}</span><span className="ml-auto rounded-full bg-slate-100 px-2 py-1 text-xs font-bold capitalize">{account.role}</span>{account.paused && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">Paused</span>}<button disabled={busy} type="button" onClick={() => { setEditing({ ...account }); setResetting(null); }} className="rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50">Edit</button><button disabled={busy} type="button" onClick={() => { setResetting(account); setNewPassword(""); setEditing(null); }} className="rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50">Change password</button><button disabled={busy} type="button" onClick={() => void togglePause(account)} className="rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50">{account.paused ? "Resume" : "Pause"}</button><button disabled={busy} type="button" onClick={() => void deleteAccount(account)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50">Delete</button></li>)}</ul> : <p className="mt-3 text-sm text-slate-500">No named admin or director accounts found.</p>}
      {editing && <form onSubmit={saveEdit} className="mt-4 grid gap-3 rounded-xl border bg-slate-50 p-4 sm:grid-cols-2"><h4 className="font-bold sm:col-span-2">Edit {editing.email}</h4><label className="text-sm">Full name<input required minLength={2} value={editing.full_name || ""} onChange={event => setEditing({ ...editing, full_name: event.target.value })} className="mt-1 w-full rounded-lg border p-3" /></label><label className="text-sm">Email<input required type="email" value={editing.email} onChange={event => setEditing({ ...editing, email: event.target.value })} className="mt-1 w-full rounded-lg border p-3" /></label><label className="text-sm">Role<select value={editing.role} onChange={event => setEditing({ ...editing, role: event.target.value })} className="mt-1 w-full rounded-lg border p-3"><option value="director">Director</option><option value="admin">Admin</option></select></label><div className="flex items-end gap-2"><button disabled={busy} type="submit" className="rounded-lg bg-[#202b70] px-4 py-3 text-sm font-bold text-white">Save changes</button><button type="button" onClick={() => setEditing(null)} className="rounded-lg border px-4 py-3 text-sm">Cancel</button></div></form>}
      {resetting && <form onSubmit={resetPassword} className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border bg-slate-50 p-4"><label className="min-w-64 flex-1 text-sm font-semibold">New password for {resetting.email}<input required minLength={8} type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} className="mt-2 w-full rounded-lg border p-3" /></label><button disabled={busy} type="submit" className="rounded-lg bg-[#202b70] px-4 py-3 text-sm font-bold text-white">Save new password</button><button type="button" onClick={() => setResetting(null)} className="rounded-lg border px-4 py-3 text-sm">Cancel</button></form>}
    </div>
  </section>;
}
