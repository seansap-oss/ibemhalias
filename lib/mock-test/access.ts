import { getMockTestAdminClient } from "./server";

const OPEN_ACCOUNT_ACCESS = new Set(["logged_in", "free", "public"]);

export type MockAccessDecision = {
  allowed: boolean;
  reason:
    | "ok"
    | "not_found"
    | "not_published"
    | "not_started"
    | "expired"
    | "not_assigned";
  test: any | null;
  accessLabel: "FREE" | "ASSIGNED" | "RESTRICTED";
};

function labelFor(accessType: unknown) {
  const value = String(accessType || "logged_in");
  if (OPEN_ACCOUNT_ACCESS.has(value)) return "FREE" as const;
  if (value === "student") return "ASSIGNED" as const;
  return "RESTRICTED" as const;
}

export async function getMockTestAccessDecision(testId: string, studentId: string): Promise<MockAccessDecision> {
  const supabase = getMockTestAdminClient();

  const { data: test, error } = await supabase
    .from("mock_tests")
    .select("id,title,status,access_type,starts_at,ends_at,attempt_limit")
    .eq("id", testId)
    .maybeSingle();

  if (error || !test) {
    return { allowed: false, reason: "not_found", test: null, accessLabel: "RESTRICTED" };
  }

  const accessLabel = labelFor(test.access_type);

  if (test.status !== "published") {
    return { allowed: false, reason: "not_published", test, accessLabel };
  }

  const now = Date.now();
  if (test.starts_at && new Date(test.starts_at).getTime() > now) {
    return { allowed: false, reason: "not_started", test, accessLabel };
  }
  if (test.ends_at && new Date(test.ends_at).getTime() < now) {
    return { allowed: false, reason: "expired", test, accessLabel };
  }

  const accessType = String(test.access_type || "logged_in");
  if (OPEN_ACCOUNT_ACCESS.has(accessType)) {
    return { allowed: true, reason: "ok", test, accessLabel: "FREE" };
  }

  if (accessType === "student") {
    const { data: assignment, error: assignmentError } = await supabase
      .from("mock_test_assignments")
      .select("id")
      .eq("test_id", testId)
      .eq("assignment_type", "student")
      .eq("assignment_id", studentId)
      .maybeSingle();

    if (assignmentError) {
      return { allowed: false, reason: "not_assigned", test, accessLabel: "ASSIGNED" };
    }

    return assignment
      ? { allowed: true, reason: "ok", test, accessLabel: "ASSIGNED" }
      : { allowed: false, reason: "not_assigned", test, accessLabel: "ASSIGNED" };
  }

  return { allowed: false, reason: "not_assigned", test, accessLabel };
}

export async function listAccessibleMockTests(studentId: string) {
  const supabase = getMockTestAdminClient();

  const { data: tests, error } = await supabase
    .from("mock_tests")
    .select(
      "id,title,description,exam_category,subject,test_type,duration_minutes,total_marks,negative_marking,language,status,access_type,attempt_limit,starts_at,ends_at,created_at"
    )
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) throw error;
  const rows = tests ?? [];
  if (!rows.length) return [];

  const restrictedStudentIds = rows
    .filter((test: any) => String(test.access_type || "logged_in") === "student")
    .map((test: any) => test.id);

  const assignedIds = new Set<string>();

  if (restrictedStudentIds.length) {
    const { data: assignments, error: assignmentError } = await supabase
      .from("mock_test_assignments")
      .select("test_id")
      .eq("assignment_type", "student")
      .eq("assignment_id", studentId)
      .in("test_id", restrictedStudentIds);

    if (assignmentError) throw assignmentError;
    for (const row of assignments ?? []) assignedIds.add(row.test_id);
  }

  return rows
    .filter((test: any) => {
      const accessType = String(test.access_type || "logged_in");
      if (OPEN_ACCOUNT_ACCESS.has(accessType)) return true;
      if (accessType === "student") return assignedIds.has(test.id);
      return false;
    })
    .map((test: any) => ({
      ...test,
      access_label: labelFor(test.access_type),
    }));
}
