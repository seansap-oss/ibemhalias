import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { canViewDirector } from "@/lib/director-access";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await canViewDirector())) {
    return NextResponse.json({ error: "Director access required" }, { status: 403 });
  }
  const db = createCmsServiceClient();
  const { data, error } = await db
    .from("profiles")
    .select("id,email,full_name,role,created_at")
    .eq("role", "admin")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const accounts = await Promise.all(
    (data || []).map(async (account) => {
      const { data: auth } = await db.auth.admin.getUserById(account.id);
      return { ...account, paused: auth.user?.app_metadata?.paused === true };
    })
  );

  return NextResponse.json({ ok: true, accounts }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  if (!(await canViewDirector())) {
    return NextResponse.json({ error: "Director access required" }, { status: 403 });
  }
  try {
    const b = await request.json();
    const email = String(b.email || "").trim().toLowerCase();
    const name = String(b.name || "").trim();
    if (!/^\S+@\S+\.\S+$/.test(email) || name.length < 2) {
      return NextResponse.json({ error: "Admin name and valid email required" }, { status: 400 });
    }
    const suppliedPassword = String(b.password || "");
    if (suppliedPassword && suppliedPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    const password = suppliedPassword || randomBytes(12).toString("base64url");
    const db = createCmsServiceClient();
    const { data, error } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "admin" },
      user_metadata: { full_name: name },
    });
    if (error || !data.user) {
      throw error || new Error("Unable to create admin account");
    }
    const { error: profileError } = await db
      .from("profiles")
      .upsert({ id: data.user.id, email, full_name: name, role: "admin" }, { onConflict: "id" });
    if (profileError) {
      await db.auth.admin.deleteUser(data.user.id);
      throw profileError;
    }
    return NextResponse.json(
      { ok: true, email, ...(suppliedPassword ? {} : { temporaryPassword: password }) },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unable to create admin account" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await canViewDirector())) {
    return NextResponse.json({ error: "Director access required" }, { status: 403 });
  }
  try {
    const { id, password, action } = await request.json();
    if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: "Valid admin account required" }, { status: 400 });
    }
    const db = createCmsServiceClient();
    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("id,email,role")
      .eq("id", id)
      .eq("role", "admin")
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) {
      return NextResponse.json({ error: "Admin account not found" }, { status: 404 });
    }

    if (action === "pause" || action === "resume") {
      const { data: auth, error: readError } = await db.auth.admin.getUserById(id);
      if (readError || !auth.user) throw readError || new Error("Admin login not found");
      const paused = action === "pause";
      const { error } = await db.auth.admin.updateUserById(id, {
        app_metadata: { ...auth.user.app_metadata, paused },
      });
      if (error) throw error;
      return NextResponse.json({ ok: true, email: profile.email, paused }, { headers: { "Cache-Control": "private, no-store" } });
    }

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    const { error } = await db.auth.admin.updateUserById(id, { password });
    if (error) throw error;
    return NextResponse.json({ ok: true, email: profile.email }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unable to update admin account" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await canViewDirector())) {
    return NextResponse.json({ error: "Director access required" }, { status: 403 });
  }
  try {
    const { id } = await request.json();
    if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: "Valid admin account required" }, { status: 400 });
    }
    const db = createCmsServiceClient();
    const { data: profile } = await db
      .from("profiles")
      .select("id,email,role")
      .eq("id", id)
      .eq("role", "admin")
      .maybeSingle();
    if (!profile) {
      return NextResponse.json({ error: "Admin account not found" }, { status: 404 });
    }
    await db.from("profiles").delete().eq("id", id);
    await db.auth.admin.deleteUser(id).catch(() => undefined);
    return NextResponse.json({ ok: true, email: profile.email }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unable to delete admin account" },
      { status: 500 }
    );
  }
}
