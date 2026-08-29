import { NextResponse } from "next/server";
import {
  getTeacherPermissions,
  requireTeacher,
} from "@/lib/teacher/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const staff = await requireTeacher();
    return NextResponse.json({
      ok: true,
      authenticated: true,
      staff: {
        id: staff.id,
        email: staff.email,
        fullName: staff.fullName,
        role: staff.role,
      },
      permissions: await getTeacherPermissions(staff),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        authenticated: false,
        error: error?.message || "UNAUTHENTICATED",
      },
      { status: Number(error?.status || 401) }
    );
  }
}
