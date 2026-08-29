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

    const supabase = createClient();
    if (!supabase) {
      setError(
        "Authentication is not configured yet. Please contact the institute."
      );
      setBusy(false);
      return;
    }

    const { error: signInError } =
      await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

    if (signInError) {
      setError(signInError.message);
      setBusy(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      await supabase.auth.signOut();
      setError("Unable to verify this student account.");
      setBusy(false);
      return;
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    const role = String(profile?.role || "").toLowerCase();

    if (profileError || role !== "student") {
      await supabase.auth.signOut();
      setError(
        "This login is not a student account. Please use the Admin Login for administrator access."
      );
      setBusy(false);
      return;
    }

    // A student login must not inherit a dedicated administrator
    // session from the same browser. Clear only the admin cookie after
    // the student identity has been verified successfully.
    await fetch("/api/admin/logout", {
      method: "POST",
      cache: "no-store",
    }).catch(() => undefined);

    sessionStorage.removeItem("admin_auth");
    sessionStorage.removeItem("admin_email");

    await claimDevice();

    const requested =
      params.get("redirectedFrom") ||
      params.get("next");

    const destination =
      requested &&
      requested.startsWith("/") &&
      !requested.startsWith("//") &&
      !requested.startsWith("/admin")
        ? requested
        : "/dashboard";

    router.replace(destination);
    router.refresh();
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
            Student sign in
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Access your assigned courses, live
            classes, study materials and group
            chat.
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
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="lg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="you@example.com"
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
