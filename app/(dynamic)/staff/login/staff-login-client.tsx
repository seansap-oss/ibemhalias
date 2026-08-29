"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { IbemhalLogo } from "@/components/brand/ibemhal-logo";
import { createClient } from "@/lib/supabase/client";
import { SITE_VERSION_LABEL } from "@/lib/site-version";

function destination(role: "admin" | "instructor", requested: string | null) {
  if (requested && requested.startsWith("/") && !requested.startsWith("//")) {
    if (
      role === "admin" &&
      (requested.startsWith("/admin") || requested.startsWith("/teacher"))
    ) {
      return requested.startsWith("/teacher")
        ? "/admin/teachers"
        : requested;
    }

    if (role === "instructor" && requested.startsWith("/teacher")) {
      return requested;
    }
  }

  return role === "admin" ? "/admin/dashboard" : "/teacher/dashboard";
}

export default function StaffLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");

    const id = identifier.trim().toLowerCase();

    try {
      const adminResponse = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: id, password }),
      });
      const adminData = await adminResponse.json().catch(() => ({}));

      if (adminResponse.ok && adminData?.authenticated) {
        const supabase = createClient();
        if (supabase) {
          await supabase.auth
            .signOut({ scope: "local" })
            .catch(() => undefined);
        }

        router.replace(
          destination("admin", searchParams.get("redirectedFrom"))
        );
        router.refresh();
        return;
      }

      if (adminResponse.status !== 401) {
        throw new Error(adminData?.error || "Unable to sign in.");
      }

      if (!id.includes("@")) {
        throw new Error(
          "Teachers sign in with their registered email address."
        );
      }

      // Clear any stale administrator cookie before establishing a teacher
      // Supabase session. Admin and teacher sessions must never overlap.
      await fetch("/api/admin/logout", { method: "POST" }).catch(
        () => undefined
      );

      const supabase = createClient();
      if (!supabase) {
        throw new Error("Staff authentication is not configured.");
      }

      const { data, error: authError } =
        await supabase.auth.signInWithPassword({
          email: id,
          password,
        });

      if (authError || !data.user) {
        throw new Error("Invalid staff email or password.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role,full_name")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        await supabase.auth.signOut().catch(() => undefined);
        throw new Error("Unable to verify this staff account.");
      }

      const role = String(profile?.role || "").toLowerCase();

      if (role === "instructor") {
        router.replace(
          destination("instructor", searchParams.get("redirectedFrom"))
        );
        router.refresh();
        return;
      }

      if (role === "admin") {
        router.replace("/admin/dashboard");
        router.refresh();
        return;
      }

      await supabase.auth.signOut().catch(() => undefined);

      throw new Error(
        role === "student"
          ? "This is a student account. Please use Student Login."
          : "This account does not have Staff Portal access."
      );
    } catch (reason: any) {
      setError(reason?.message || "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-[#07101f] via-[#102968] to-indigo-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-7 flex justify-center">
          <IbemhalLogo
            href="/"
            priority
            imageClassName="h-[70px] w-auto"
          />
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white p-6 shadow-2xl sm:p-8">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700">
            {searchParams.get("role") === "teacher" ? (
              <GraduationCap className="h-5 w-5" />
            ) : (
              <ShieldCheck className="h-5 w-5" />
            )}
          </div>

          <h1 className="mt-4 text-center text-2xl font-black text-slate-950">
            Staff Login
          </h1>
          <p className="mt-2 text-center text-sm leading-6 text-slate-500">
            Administrators and teachers sign in with their own account.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {error ? (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            ) : null}

            <label className="block text-xs font-black text-slate-600">
              Staff ID / Email
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  autoComplete="username"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
                  placeholder="admin or teacher@email.com"
                />
              </div>
            </label>

            <label className="block text-xs font-black text-slate-600">
              Password
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-11 text-sm outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  {show ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </label>

            <button
              disabled={busy}
              className="min-h-12 w-full rounded-xl bg-[#102968] text-sm font-black text-white disabled:opacity-50"
            >
              {busy ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link
              href="/login"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-center text-xs font-black text-slate-700"
            >
              Student Login
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-center text-xs font-black text-slate-700"
            >
              Website Home
            </Link>
          </div>

          <div className="mt-5 text-center text-[9px] font-bold text-slate-400">
            {SITE_VERSION_LABEL}
          </div>
        </div>
      </div>
    </div>
  );
}
