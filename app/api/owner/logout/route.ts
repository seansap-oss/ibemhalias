import { NextResponse } from "next/server";
import { OWNER_COOKIE } from "@/lib/super-admin";
export async function POST() { const response = NextResponse.json({ ok: true }); response.cookies.delete(OWNER_COOKIE); return response; }
