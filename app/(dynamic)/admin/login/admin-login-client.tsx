"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { IbemhalLogo } from "@/components/brand/ibemhal-logo";
import { SITE_VERSION_LABEL } from "@/lib/site-version";
import { createClient } from "@/lib/supabase/client";

function getSafeAdminDestination(value: string | null) {
  if (
    !value ||
    !value.startsWith("/admin") ||
    value.startsWith("//") ||
    value === "/admin/login" ||
    value.startsWith("/admin/login?")
  ) {
    return "/admin/dashboard";
  }

  return value;
}

export default function AdminLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] =
    React.useState("");
  const [password, setPassword] =
    React.useState("");
  const [showPassword, setShowPassword] =
    React.useState(false);
  const [error, setError] =
    React.useState("");
  const [loading, setLoading] =
    React.useState(false);

  React.useEffect(() => {
    fetch("/api/admin/session", {
      cache: "no-store",
    })
      .then((response) =>
        response.ok ? response.json() : null
      )
      .then((data) => {
        if (data?.authenticated) {
          router.replace(
            getSafeAdminDestination(
              searchParams.get(
                "redirectedFrom"
              )
            )
          );
        }
      })
      .catch(() => {});
  }, [router, searchParams]);

  const handleLogin = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "/api/admin/login",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            identifier: email.trim(),
            password,
          }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Invalid credentials."
        );
      }

      // Administrator and student sessions are intentionally
      // separated. Only after the admin credentials succeed do we
      // clear any browser-side Supabase student session.
      const supabase = createClient();
      if (supabase) {
        await supabase.auth
          .signOut({ scope: "local" })
          .catch(() => undefined);
      }

      sessionStorage.removeItem("admin_auth");
      sessionStorage.removeItem("admin_email");

      router.replace(
        getSafeAdminDestination(
          searchParams.get("redirectedFrom")
        )
      );
      router.refresh();
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to sign in."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4">
      <div className="absolute inset-0 grid-overlay opacity-20" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <IbemhalLogo
            href="/"
            priority
            imageClassName="h-[76px] w-auto"
          />
        </div>

        <Card className="glass-card shadow-2xl">
          <CardHeader className="pb-2 text-center">
            <CardTitle className="text-xl">
              Admin Login
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Sign in to manage courses, live
              classes and content
            </p>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={handleLogin}
              className="space-y-4"
            >
              {error ? (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="email">
                  Admin ID / Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="text"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value
                      )
                    }
                    placeholder="admin or admin@ibemhal.ias"
                    className="pl-10"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value
                      )
                    }
                    placeholder="••••••••"
                    className="pl-10 pr-11"
                    autoComplete="current-password"
                    required
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
                disabled={loading}
              >
                {loading
                  ? "Signing in..."
                  : "Sign In"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Link
                href="/"
                className="text-xs text-muted-foreground hover:text-primary"
              >
                ← Back to website
              </Link>
            </div>

            <div className="mt-3 text-center text-[9px] font-bold text-slate-400">
              {SITE_VERSION_LABEL}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
