"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { IbemhalLogo } from "@/components/brand/ibemhal-logo";

export default function AdminLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (data?.authenticated) router.replace(searchParams.get("redirectedFrom") || "/admin/dashboard"); })
      .catch(() => {});
  }, [router, searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Invalid credentials.");
      sessionStorage.setItem("admin_auth", "true"); sessionStorage.setItem("admin_email", email);
      router.replace(searchParams.get("redirectedFrom") || "/admin/dashboard"); router.refresh();
    } catch (err: any) { setError(err?.message || "Unable to sign in."); }
    finally { setLoading(false); }
  };

  return <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4"><div className="absolute inset-0 grid-overlay opacity-20" /><motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md"><div className="text-center mb-8"><IbemhalLogo href="/" priority imageClassName="h-[76px] w-auto" /></div><Card className="glass-card shadow-2xl"><CardHeader className="text-center pb-2"><CardTitle className="text-xl">Admin Login</CardTitle><p className="text-sm text-muted-foreground">Sign in to manage courses and content</p></CardHeader><CardContent><form onSubmit={handleLogin} className="space-y-4">{error && <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"><AlertCircle className="h-4 w-4" />{error}</div>}<div className="space-y-2"><Label htmlFor="email">Email</Label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="admin@ibemhal.ias" className="pl-10" autoComplete="username" required /></div></div><div className="space-y-2"><Label htmlFor="password">Password</Label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" className="pl-10" autoComplete="current-password" required /></div></div><Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in..." : "Sign In"}</Button></form><div className="mt-4 text-center"><Link href="/" className="text-xs text-muted-foreground hover:text-primary">â† Back to website</Link></div></CardContent></Card></motion.div></div>;
}


