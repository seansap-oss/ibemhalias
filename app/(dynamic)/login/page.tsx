"use client";

import * as React from "react";
import Link from "next/link";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  MonitorSmartphone,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { claimDevice } from "@/lib/supabase/auth-device";
import { IbemhalLogo } from "@/components/brand/ibemhal-logo";
import { SITE_VERSION_LABEL } from "@/lib/site-version";

const REASONS: Record<
  string,
  { title: string; body: string }
> = {
  concurrent_login: {
    title: "Signed in on another device",
    body:
      "Your account was opened elsewhere. For content security only one device can be active at a time — sign in again to use this device.",
  },
  session_expired: {
    title: "Session expired",
    body:
      "Please sign in again to continue your preparation.",
  },
  unbound: {
    title: "Device verification needed",
    body:
      "Sign in to register this device with your account.",
  },
};

function resolveSafeRedirect(
  role: "student" | "instructor" | "admin" | "director",
  requested: string | null
) {
  if (requested && requested.startsWith("/") && !requested.startsWith("//")) {
    if (
      role === "admin" &&
      (requested.startsWith("/admin") || requested.startsWith("/teacher"))
    ) {
      return requested.startsWith("/teacher") ? "/admin/teachers" : requested;
    }
    if (role === "instructor" && requested.startsWith("/teacher")) {
      return requested;
    }
    if (role === "director" && requested.startsWith("/director")) {
      return requested;
    }
    if (
      role === "student" &&
      !requested.startsWith("/admin") &&
      !requested.startsWith("/teacher") &&
      !requested.startsWith("/director")
    ) {
      return requested;
    }
  }

  if (role === "admin") return "/admin/dashboard";
  if (role === "instructor") return "/teacher/dashboard";
  if (role === "director") return "/director/dashboard";
  return "/dashboard";
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const reason =
    REASONS[params.get("reason") ?? ""];

  const [email, setEmail] =
    React.useState("");
  const [password, setPassword] =
    React.useState("");
  const [showPassword, setShowPassword] =
    React.useState(false);
  const [busy, setBusy] =
    React.useState(false);
  const [error, setError] =
    React.useState("");

  const submit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();
    setBusy(true);
    setError("");

    const identifier = email.trim().toLowerCase();
    const requested =
      params.get("redirectedFrom") ||
      params.get("next");

    try {
      // 1. Check dedicated admin session first (supports both admin username and email).
      const adminResponse = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const adminData = await adminResponse.json().catch(() => ({}));

      if (adminResponse.ok && adminData?.authenticated) {
        await fetch("/api/owner/logout", {
          method: "POST",
          cache: "no-store",
        }).catch(() => undefined);
        const supabase = createClient();
        if (supabase) {
          await supabase.auth
            .signOut({ scope: "local" })
            .catch(() => undefined);
        }

        router.replace(resolveSafeRedirect("admin", requested));
        router.refresh();
        return;
      }

      if (adminResponse.status !== 401) {
        throw new Error(adminData?.error || "Unable to sign in.");
      }

      if (!identifier.includes("@")) {
        throw new Error(
          "Please enter a valid email address or administrator username."
        );
      }

      // 2. Clear any stale dedicated admin cookie before Supabase sign-in.
      await fetch("/api/admin/logout", {
        method: "POST",
        cache: "no-store",
      }).catch(() => undefined);

      const supabase = createClient();
      if (!supabase) {
        throw new Error(
          "Authentication is not configured yet. Please contact the institute."
        );
      }

      const { data: authData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: identifier,
          password,
        });

      if (signInError || !authData.user) {
        throw new Error(signInError?.message || "Invalid email or password.");
      }

      if (authData.user.app_metadata?.paused === true) {
        await supabase.auth.signOut().catch(() => undefined);
        throw new Error(
          "This account is currently paused. Please contact the institute."
        );
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (profileError) {
        await supabase.auth.signOut().catch(() => undefined);
        throw new Error("Unable to verify this account.");
      }

      const role = String(profile?.role || "").toLowerCase();

      if (role === "student") {
        await fetch("/api/owner/logout", {
          method: "POST",
          cache: "no-store",
        }).catch(() => undefined);
        sessionStorage.removeItem("admin_auth");
        sessionStorage.removeItem("admin_email");

        await claimDevice();
        router.replace(resolveSafeRedirect("student", requested));
        router.refresh();
        return;
      }

      if (role === "instructor" || role === "admin" || role === "director") {
        await fetch("/api/owner/logout", {
          method: "POST",
          cache: "no-store",
        }).catch(() => undefined);
        const activityResponse = await fetch("/api/activity/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "start" }),
        });
        if (role === "director" && !activityResponse.ok) {
          throw new Error(
            "Unable to start the director session. Please try signing in again."
          );
        }
        router.replace(
          resolveSafeRedirect(
            role as "instructor" | "admin" | "director",
            requested
          )
        );
        router.refresh();
        return;
      }

      await supabase.auth.signOut().catch(() => undefined);
      throw new Error(
        "This account does not have portal access. Please contact the institute."
      );
    } catch (reasonErr: any) {
      setError(reasonErr?.message || "Unable to sign in.");
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 text-center">
        <IbemhalLogo
          href="/"
          priority
          imageClassName="h-[72px] w-auto"
        />
      </div>

      {reason ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50 p-3.5"
        >
          <MonitorSmartphone className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-xs font-semibold text-amber-900">
              {reason.title}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800/80">
              {reason.body}
            </p>
          </div>
        </motion.div>
      ) : null}

      <Card>
        <CardContent className="p-6">
          <h1 className="text-lg font-bold">
            Portal Sign In
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Sign in with your Student, Teacher, Admin, or Director account.
          </p>

          <form
            onSubmit={submit}
            className="mt-5 space-y-3"
          >
            {error ? (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="lg-email">
                Email or Username
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="lg-email"
                  type="text"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="you@example.com or admin"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lg-pw">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="lg-pw"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  required
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="••••••••"
                  className="pl-10 pr-11"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={busy}
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            New here?{" "}
            <Link
              href="/#courses"
              className="font-medium text-primary hover:underline"
            >
              Browse courses to enrol
            </Link>
          </p>
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-[10px] leading-relaxed text-muted-foreground">
        Your account is limited to one active
        device to protect course content.
      </p>
      <div className="mt-2 text-center text-[9px] font-bold text-slate-400">
        {SITE_VERSION_LABEL}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF8F6] p-4">
      <div className="absolute inset-0 grid-overlay opacity-30" />
      <div className="relative">
        <React.Suspense
          fallback={
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          }
        >
          <LoginForm />
        </React.Suspense>
      </div>
    </div>
  );
}
