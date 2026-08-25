import { NextRequest, NextResponse } from "next/server";
import {
  createAdminSessionToken,
  getAdminCookieName,
  getAdminCredentials,
} from "@/lib/admin-session";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const admin = getAdminCredentials();

    if (email !== admin.email || password !== admin.password) {
      return NextResponse.json(
        { error: "Invalid credentials. Please try again." },
        { status: 401 }
      );
    }

    const token = await createAdminSessionToken(email);

    const response = NextResponse.json({ ok: true, email });

    response.cookies.set({
      name: getAdminCookieName(),
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 8 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to sign in." },
      { status: 500 }
    );
  }
}
