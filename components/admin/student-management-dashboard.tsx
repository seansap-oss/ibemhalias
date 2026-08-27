"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileDown,
  FileUp,
  Loader2,
  LockKeyhole,
  Mail,
  PackageCheck,
  RefreshCw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { SITE_CONTACT } from "@/lib/site-contact";

type AnyRow = Record<string, any>;
type PaymentSource =
  | "cash_counter"
  | "phone_booking"
  | "manual_admin"
  | "online_gateway";

type StudentRow = {
  id: string;
  student_code: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  tier: string;
  whatsapp_opt_in: boolean;
  created_at: string;
  package_ids: string[];
  package_names: string[];
  assigned_class_ids: string[];
  assigned_count: number;
  payment_source: PaymentSource;
  account_status?: "active" | "inactive";
  batch?: string;
  preferences?: {
    reminder_day_before?: boolean;
    reminder_hour_before?: boolean;
    sms_enabled?: boolean;
    material_flags?: Record<string, boolean>;
  };
};

type Course = { id: string; title: string };
type LiveClass = {
  id: string;
  title: string;
  topic: string;
  starts_at: string | null;
  status: string;
};

const PREMIUM_FLAGS = [
  ["detailed_study_notes", "Detailed Study Notes"],
  ["premium_lectures", "Premium Lectures"],
  ["premium_test_series", "Test Series (Premium)"],
  ["mentor_notes", "Mentor Notes"],
] as const;

const FREE_MATERIALS = [
  "Class Notes (Free)",
  "Current Affairs PDF",
  "Previous Year Papers",
  "MCQ Practice (Free)",
];

async function readJson(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: text || `${response.status} ${response.statusText}` };
  }
}

async function postLive(action: string, body: AnyRow = {}) {
  const response = await fetch("/api/live-class/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  });
  const data = await readJson(response);
  if (!response.ok || !data.ok) {
    throw new Error(data.error || data?.result?.error || `HTTP ${response.status}`);
  }
  return data;
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-[11px] font-semibold text-slate-700">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          "relative h-6 w-11 rounded-full transition-all duration-150",
          checked ? "border-2 border-[#0b3d91] bg-[#1565c0] shadow-[0_0_0_3px_rgba(21,101,192,0.14)]" : "border-2 border-slate-400 bg-slate-200",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-md ring-1 ring-black/10 transition-all",
            checked ? "left-[20px]" : "left-[2px]",
          ].join(" ")}
        />
      </button>
    </label>
  );
}

function ActionButton({
  title,
  children,
  tone = "blue",
  onClick,
}: {
  title: string;
  children: React.ReactNode;
  tone?: "blue" | "orange" | "red" | "green";
  onClick: () => void;
}) {
  const toneClass = {
    blue: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
    orange: "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100",
    red: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
    green: "border-green-200 bg-green-50 text-green-700 hover:bg-green-100",
  }[tone];

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded-lg border transition ${toneClass}`}
    >
      {children}
    </button>
  );
}

export function StudentManagementDashboard() {
  const [students, setStudents] = React.useState<StudentRow[]>([]);
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [classes, setClasses] = React.useState<LiveClass[]>([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "assigned" | "unassigned">("all");
  const [pageSize, setPageSize] = React.useState(10);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [showAdd, setShowAdd] = React.useState(false);
  const [showAddPassword, setShowAddPassword] = React.useState(false);
  const [editingStudent, setEditingStudent] = React.useState<StudentRow | null>(null);
  const [showEditPassword, setShowEditPassword] = React.useState(false);
  const [editTab, setEditTab] = React.useState<"profile" | "access" | "activity" | "notes">("profile");
  const [editLoading, setEditLoading] = React.useState(false);
  const [editStudentDraft, setEditStudentDraft] = React.useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    accountStatus: "active" as "active" | "inactive",
    batch: "",
    remarks: "",
    createdAt: "",
    lastSignInAt: "",
  });
  const [newStudent, setNewStudent] = React.useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    whatsappOptIn: true,
  });
  const importRef = React.useRef<HTMLInputElement | null>(null);

  const [draft, setDraft] = React.useState({
    packageIds: [] as string[],
    classIds: [] as string[],
    tier: "free",
    paymentSource: "cash_counter" as PaymentSource,
    whatsappOptIn: true,
    reminderDayBefore: true,
    reminderHourBefore: true,
    smsEnabled: false,
    materialFlags: Object.fromEntries(PREMIUM_FLAGS.map(([key]) => [key, false])) as Record<string, boolean>,
  });

  const selected = students.find((s) => s.id === selectedId) || null;

  const load = React.useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/student-access", {
        cache: "no-store",
      });
      const payload = await readJson(response);
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }
      setStudents(payload.students || []);
      setCourses(payload.courses || []);
      setClasses(payload.classes || []);
      setSelectedId((current) => current || payload.students?.[0]?.id || "");
    } catch (error: any) {
      setMessage(error?.message || "Unable to load student management.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!selected) return;
    const flags = {
      ...Object.fromEntries(PREMIUM_FLAGS.map(([key]) => [key, false])),
      ...(selected.preferences?.material_flags || {}),
    };
    setDraft({
      packageIds: [...(selected.package_ids || [])],
      classIds: [...(selected.assigned_class_ids || [])],
      tier: selected.tier || "free",
      paymentSource: selected.payment_source || "cash_counter",
      whatsappOptIn: selected.whatsapp_opt_in !== false,
      reminderDayBefore: selected.preferences?.reminder_day_before !== false,
      reminderHourBefore: selected.preferences?.reminder_hour_before !== false,
      smsEnabled: selected.preferences?.sms_enabled === true,
      materialFlags: flags,
    });
  }, [selectedId, selected]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      const matchesSearch =
        !q ||
        `${s.student_code || ""} ${s.full_name} ${s.email} ${s.phone || ""}`
          .toLowerCase()
          .includes(q);
      const assigned = (s.assigned_count || 0) > 0;
      const matchesFilter =
        filter === "all" ||
        (filter === "assigned" && assigned) ||
        (filter === "unassigned" && !assigned);
      return matchesSearch && matchesFilter;
    });
  }, [students, search, filter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  React.useEffect(() => setPage(1), [search, filter, pageSize]);

  const saveAssignment = async (allAccess = false) => {
    if (!selected) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/student-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_assignment",
          studentId: selected.id,
          packageIds: allAccess ? courses.map((c) => c.id) : draft.packageIds,
          classIds: allAccess ? classes.map((c) => c.id) : draft.classIds,
          tier: allAccess ? "all-access" : draft.tier,
          paymentSource: draft.paymentSource,
          whatsappOptIn: draft.whatsappOptIn,
          reminderDayBefore: draft.reminderDayBefore,
          reminderHourBefore: draft.reminderHourBefore,
          smsEnabled: draft.smsEnabled,
          materialFlags: allAccess
            ? Object.fromEntries(PREMIUM_FLAGS.map(([key]) => [key, true]))
            : draft.materialFlags,
        }),
      });
      const payload = await readJson(response);
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Unable to save assignment.");
      }
      setMessage(allAccess ? "All-access assignment saved." : "Student assignment saved.");
      await load();
    } catch (error: any) {
      setMessage(error?.message || "Unable to save assignment.");
    } finally {
      setSaving(false);
    }
  };

  const sendConfirmation = async () => {
    if (!selected) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/student-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_confirmation",
          studentId: selected.id,
        }),
      });
      const payload = await readJson(response);
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || payload.result?.error || "Unable to send confirmation.");
      }
      setMessage("Confirmation sent.");
    } catch (error: any) {
      setMessage(error?.message || "Unable to send confirmation.");
    } finally {
      setSaving(false);
    }
  };

  const addStudent = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await postLive("create_student", newStudent);
      setShowAdd(false);
      setNewStudent({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        whatsappOptIn: true,
      });
      setShowAddPassword(false);
      setMessage("Student created.");
      await load();
    } catch (error: any) {
      setMessage(error?.message || "Unable to create student.");
    } finally {
      setSaving(false);
    }
  };

  const openEditStudent = async (student: StudentRow) => {
    setEditingStudent(student);
    setShowEditPassword(false);
    setEditTab("profile");
    setEditLoading(true);
    setEditStudentDraft({
      fullName: student.full_name || "",
      email: student.email || "",
      phone: student.phone || "",
      password: "",
      accountStatus: student.account_status === "inactive" ? "inactive" : "active",
      batch: student.batch || "",
      remarks: "",
      createdAt: student.created_at || "",
      lastSignInAt: "",
    });

    try {
      const payload = await postLive("student_account_detail", {
        studentId: student.id,
      });

      const account = payload.account || {};
      setEditStudentDraft((current) => ({
        ...current,
        email: account.email || current.email,
        accountStatus:
          account.status === "inactive" ? "inactive" : "active",
        batch: account.batch || "",
        remarks: account.remarks || "",
        createdAt: account.createdAt || current.createdAt,
        lastSignInAt: account.lastSignInAt || "",
      }));
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Student profile opened, but account security details could not be loaded."
      );
    } finally {
      setEditLoading(false);
    }
  };

  const saveEditedStudent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingStudent) return;

    setSaving(true);
    setMessage("");

    try {
      await postLive("update_student", {
        studentId: editingStudent.id,
        fullName: editStudentDraft.fullName,
        email: editStudentDraft.email,
        phone: editStudentDraft.phone,
        password: editStudentDraft.password || undefined,
        accountStatus: editStudentDraft.accountStatus,
        batch: editStudentDraft.batch,
        remarks: editStudentDraft.remarks,
      });

      setMessage(
        editStudentDraft.password
          ? "Student profile, login and password updated."
          : "Student profile and login details updated."
      );

      setEditingStudent(null);
      setShowEditPassword(false);
      await load();
    } catch (error: any) {
      setMessage(error?.message || "Unable to update student.");
    } finally {
      setSaving(false);
    }
  };

  const deactivateStudent = async (student: StudentRow) => {
    const ok = window.confirm(
      `Remove all package/class access for ${student.full_name}? The account is kept for audit history.`
    );
    if (!ok) return;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/student-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "clear_access",
          studentId: student.id,
        }),
      });
      const payload = await readJson(response);
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Unable to clear access.");
      }
      setMessage("Student access cleared.");
      await load();
    } catch (error: any) {
      setMessage(error?.message || "Unable to clear access.");
    } finally {
      setSaving(false);
    }
  };

  const exportStudents = () => {
    const rows = [
      [
        "Student ID",
        "Student Name",
        "Email",
        "Mobile",
        "Packages",
        "Assigned Classes",
        "Payment Mode",
      ],
      ...students.map((s) => [
        s.student_code || "",
        s.full_name,
        s.email,
        s.phone || "",
        (s.package_names || []).join(" | "),
        String(s.assigned_count || 0),
        s.payment_source,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ibemhal-students-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importStudents = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
      setMessage("Import file is empty.");
      return;
    }

    const header = lines[0].split(",").map((x) => x.replace(/^"|"$/g, "").trim().toLowerCase());
    const indexOf = (names: string[]) =>
      names.map((name) => header.indexOf(name)).find((index) => index >= 0) ?? -1;

    const nameIndex = indexOf(["student name", "name", "full name"]);
    const emailIndex = indexOf(["email", "username"]);
    const phoneIndex = indexOf(["mobile", "phone", "whatsapp"]);

    if (nameIndex < 0 || emailIndex < 0 || phoneIndex < 0) {
      setMessage("CSV needs Student Name/Name, Email and Mobile/Phone columns.");
      return;
    }

    const records = lines.slice(1).map((line) => {
      const cols = line.split(",").map((x) => x.replace(/^"|"$/g, "").trim());
      return {
        fullName: cols[nameIndex] || "",
        email: cols[emailIndex] || "",
        phone: cols[phoneIndex] || "",
      };
    }).filter((row) => row.fullName && row.email && row.phone);

    setSaving(true);
    try {
      const response = await fetch("/api/admin/student-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import_students",
          records,
        }),
      });
      const payload = await readJson(response);
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Import failed.");
      }
      setMessage(`Imported ${payload.created || 0} students. ${payload.skipped || 0} skipped.`);
      await load();
    } catch (error: any) {
      setMessage(error?.message || "Import failed.");
    } finally {
      setSaving(false);
      if (importRef.current) importRef.current.value = "";
    }
  };

  const assignedCount = students.filter((s) => s.assigned_count > 0).length;
  const unassignedCount = students.length - assignedCount;

  if (loading) {
    return (
      <div className="grid min-h-[500px] place-items-center rounded-2xl bg-white">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading student management…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-130px)] bg-white font-sans text-slate-900 antialiased">
      <div className="mx-auto max-w-[1900px]">
        <div className="border-b border-slate-200 bg-white px-4 py-5 lg:px-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="rounded bg-slate-100 px-2 py-1 text-lg font-black">D1</span>
                <span className="rounded bg-slate-100 px-2 py-1 text-lg font-black">E1</span>
                <div className="rounded border border-slate-200 bg-slate-50 px-5 py-2 text-center">
                  <div className="text-base font-black uppercase tracking-wide">User Registrations</div>
                  <div className="text-sm font-bold uppercase tracking-wide">Student Dashboard</div>
                </div>
              </div>
            </div>
            <Link
              href="/admin/profile"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm"
            >
              ADMIN<br />
              <span className="font-semibold text-slate-500">Profile</span>
            </Link>
          </div>
        </div>

        <div className="grid xl:grid-cols-[minmax(0,1fr)_430px]">
          <section className="min-w-0 border-r border-slate-200 p-4 lg:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/admin/notifications"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-orange-500 px-4 text-xs font-black text-white shadow-sm"
              >
                <Send className="h-4 w-4" />
                Send Notification
              </Link>

              <button
                type="button"
                onClick={() => setShowAdd((value) => !value)}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#2f75bd] px-4 text-xs font-black text-white shadow-sm"
              >
                <UserPlus className="h-4 w-4" />
                Add Student
              </button>

              <button
                type="button"
                onClick={exportStudents}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-green-600 px-4 text-xs font-black text-white shadow-sm"
              >
                <FileDown className="h-4 w-4" />
                Export Student
              </button>

              <button
                type="button"
                onClick={() => importRef.current?.click()}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#2f75bd] px-4 text-xs font-black text-white shadow-sm"
              >
                <FileUp className="h-4 w-4" />
                Import Student
              </button>
              <input
                ref={importRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importStudents(file);
                }}
              />

              <div className="relative ml-auto min-w-[250px] flex-1 md:max-w-[420px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, email or mobile..."
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-xs outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {showAdd ? (
              <form
                onSubmit={addStudent}
                className="mt-4 grid gap-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4 md:grid-cols-5"
              >
                <input
                  required
                  value={newStudent.fullName}
                  onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })}
                  placeholder="Student name"
                  className="h-10 rounded-lg border px-3 text-xs"
                />
                <input
                  required
                  type="email"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                  placeholder="Email / username"
                  className="h-10 rounded-lg border px-3 text-xs"
                />
                <input
                  required
                  value={newStudent.phone}
                  onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                  placeholder="Mobile / WhatsApp"
                  className="h-10 rounded-lg border px-3 text-xs"
                />
                <div className="relative">
                  <input
                    required
                    minLength={6}
                    type={showAddPassword ? "text" : "password"}
                    value={newStudent.password}
                    onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                    placeholder="Student password"
                    autoComplete="new-password"
                    className="h-10 w-full rounded-lg border px-3 pr-10 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword((value) => !value)}
                    className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-slate-500 hover:bg-slate-100"
                    aria-label={showAddPassword ? "Hide password" : "Show password"}
                    title={showAddPassword ? "Hide password" : "Show password"}
                  >
                    {showAddPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <button
                  disabled={saving}
                  className="rounded-lg bg-[#174699] px-4 text-xs font-black text-white"
                >
                  {saving ? "Creating…" : "Create Student"}
                </button>
              </form>
            ) : null}

            {editingStudent ? (
              <div
                className="fixed inset-0 z-[180] overflow-y-auto bg-slate-950/50 p-0 backdrop-blur-[2px] sm:p-4"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget && !saving) {
                    setEditingStudent(null);
                  }
                }}
              >
                <div className="mx-auto flex min-h-full w-full items-start justify-center sm:items-center">
                  <form
                    onSubmit={saveEditedStudent}
                    className="flex min-h-screen w-full flex-col overflow-hidden bg-white shadow-2xl sm:min-h-0 sm:max-h-[94vh] sm:max-w-[1120px] sm:rounded-3xl sm:border sm:border-slate-200"
                  >
                    <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-500 text-sm font-black text-white shadow-sm">
                            {editingStudent.full_name
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((part) => part[0])
                              .join("")
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="truncate text-lg font-black tracking-tight text-slate-950 sm:text-xl">
                                Edit Student
                              </h2>
                              <span
                                className={[
                                  "rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide",
                                  editStudentDraft.accountStatus === "inactive"
                                    ? "bg-slate-100 text-slate-600"
                                    : "bg-green-100 text-green-700",
                                ].join(" ")}
                              >
                                {editStudentDraft.accountStatus}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[10px] font-semibold text-slate-500">
                              <span>
                                Student ID:{" "}
                                {editingStudent.student_code ||
                                  editingStudent.id.slice(0, 8)}
                              </span>
                              <span>•</span>
                              <span>
                                Registered{" "}
                                {new Date(
                                  editStudentDraft.createdAt ||
                                    editingStudent.created_at
                                ).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => setEditingStudent(null)}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
                          aria-label="Close student editor"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-4 flex gap-1 overflow-x-auto rounded-xl bg-slate-50 p-1">
                        {[
                          ["profile", "Profile"],
                          ["access", "Packages & Access"],
                          ["activity", "Activity"],
                          ["notes", "Notes"],
                        ].map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() =>
                              setEditTab(
                                value as
                                  | "profile"
                                  | "access"
                                  | "activity"
                                  | "notes"
                              )
                            }
                            className={[
                              "whitespace-nowrap rounded-lg px-3 py-2 text-[10px] font-black transition sm:text-xs",
                              editTab === value
                                ? "bg-white text-[#174699] shadow-sm ring-1 ring-slate-200"
                                : "text-slate-500 hover:text-slate-800",
                            ].join(" ")}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_330px]">
                      <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
                        {editLoading ? (
                          <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[10px] font-bold text-blue-700">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Loading account security details…
                          </div>
                        ) : null}

                        {editTab === "profile" ? (
                          <div>
                            <div className="mb-4">
                              <h3 className="text-sm font-black text-slate-950">
                                Profile & Login
                              </h3>
                              <p className="mt-1 text-[10px] font-semibold leading-relaxed text-slate-500">
                                Update the student identity and login details in one place.
                                Email and password changes are applied to Supabase Auth.
                              </p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                              <label className="block text-xs font-black text-slate-700">
                                Full Name <span className="text-red-500">*</span>
                                <input
                                  required
                                  value={editStudentDraft.fullName}
                                  onChange={(event) =>
                                    setEditStudentDraft((current) => ({
                                      ...current,
                                      fullName: event.target.value,
                                    }))
                                  }
                                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-[#174699] focus:ring-4 focus:ring-blue-50"
                                />
                              </label>

                              <label className="block text-xs font-black text-slate-700">
                                Email Address <span className="text-red-500">*</span>
                                <input
                                  required
                                  type="email"
                                  value={editStudentDraft.email}
                                  onChange={(event) =>
                                    setEditStudentDraft((current) => ({
                                      ...current,
                                      email: event.target.value,
                                    }))
                                  }
                                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-[#174699] focus:ring-4 focus:ring-blue-50"
                                />
                              </label>

                              <label className="block text-xs font-black text-slate-700">
                                Mobile / WhatsApp <span className="text-red-500">*</span>
                                <input
                                  required
                                  value={editStudentDraft.phone}
                                  onChange={(event) =>
                                    setEditStudentDraft((current) => ({
                                      ...current,
                                      phone: event.target.value,
                                    }))
                                  }
                                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-[#174699] focus:ring-4 focus:ring-blue-50"
                                />
                              </label>

                              <label className="block text-xs font-black text-slate-700">
                                New Password
                                <div className="relative mt-1.5">
                                  <input
                                    minLength={6}
                                    type={showEditPassword ? "text" : "password"}
                                    value={editStudentDraft.password}
                                    onChange={(event) =>
                                      setEditStudentDraft((current) => ({
                                        ...current,
                                        password: event.target.value,
                                      }))
                                    }
                                    placeholder="Leave blank to keep current password"
                                    autoComplete="new-password"
                                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pr-11 text-sm outline-none transition focus:border-[#174699] focus:ring-4 focus:ring-blue-50"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShowEditPassword((value) => !value)
                                    }
                                    className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
                                    aria-label={
                                      showEditPassword
                                        ? "Hide new password"
                                        : "Show new password"
                                    }
                                  >
                                    {showEditPassword ? (
                                      <EyeOff className="h-4 w-4" />
                                    ) : (
                                      <Eye className="h-4 w-4" />
                                    )}
                                  </button>
                                </div>
                                <span className="mt-1 block text-[9px] font-semibold text-slate-400">
                                  Current passwords are never displayed. Enter a new password only when resetting it.
                                </span>
                              </label>

                              <label className="block text-xs font-black text-slate-700">
                                Account Status
                                <select
                                  value={editStudentDraft.accountStatus}
                                  onChange={(event) =>
                                    setEditStudentDraft((current) => ({
                                      ...current,
                                      accountStatus:
                                        event.target.value === "inactive"
                                          ? "inactive"
                                          : "active",
                                    }))
                                  }
                                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-[#174699] focus:ring-4 focus:ring-blue-50"
                                >
                                  <option value="active">Active</option>
                                  <option value="inactive">Inactive</option>
                                </select>
                              </label>

                              <label className="block text-xs font-black text-slate-700">
                                Student Group / Batch
                                <input
                                  value={editStudentDraft.batch}
                                  onChange={(event) =>
                                    setEditStudentDraft((current) => ({
                                      ...current,
                                      batch: event.target.value,
                                    }))
                                  }
                                  placeholder="e.g. Foundation Batch 2026"
                                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-[#174699] focus:ring-4 focus:ring-blue-50"
                                />
                              </label>
                            </div>
                          </div>
                        ) : null}

                        {editTab === "access" ? (
                          <div>
                            <h3 className="text-sm font-black text-slate-950">
                              Packages & Access
                            </h3>
                            <p className="mt-1 text-[10px] font-semibold text-slate-500">
                              Review the current access here. Use the existing assignment panel
                              after saving if you need to change packages, live classes or premium material.
                            </p>

                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <div className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                                  Packages
                                </div>
                                <div className="mt-2 text-2xl font-black text-slate-950">
                                  {editingStudent.package_ids.length}
                                </div>
                              </div>
                              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <div className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                                  Live Classes
                                </div>
                                <div className="mt-2 text-2xl font-black text-slate-950">
                                  {editingStudent.assigned_count}/{classes.length}
                                </div>
                              </div>
                              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <div className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                                  Material Tier
                                </div>
                                <div className="mt-2 text-sm font-black capitalize text-[#174699]">
                                  {editingStudent.tier.replace("-", " + ")}
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                              <div className="text-xs font-black text-slate-800">
                                Current Packages
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {editingStudent.package_names.length ? (
                                  editingStudent.package_names.map((name) => (
                                    <span
                                      key={name}
                                      className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-bold text-blue-700"
                                    >
                                      {name}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[10px] font-semibold text-slate-400">
                                    No package assigned.
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-[10px] font-semibold leading-relaxed text-blue-800">
                              Package, class and premium-material assignment remains in the
                              right-side Student Access panel so there is one source of truth
                              for access control.
                            </div>
                          </div>
                        ) : null}

                        {editTab === "activity" ? (
                          <div>
                            <h3 className="text-sm font-black text-slate-950">
                              Account Activity
                            </h3>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <div className="rounded-2xl border border-slate-200 p-4">
                                <div className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                                  Registered
                                </div>
                                <div className="mt-2 text-sm font-black text-slate-800">
                                  {editStudentDraft.createdAt
                                    ? new Date(editStudentDraft.createdAt).toLocaleString("en-IN")
                                    : "Not available"}
                                </div>
                              </div>
                              <div className="rounded-2xl border border-slate-200 p-4">
                                <div className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                                  Last Sign In
                                </div>
                                <div className="mt-2 text-sm font-black text-slate-800">
                                  {editStudentDraft.lastSignInAt
                                    ? new Date(editStudentDraft.lastSignInAt).toLocaleString("en-IN")
                                    : "No recorded sign in"}
                                </div>
                              </div>
                              <div className="rounded-2xl border border-slate-200 p-4">
                                <div className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                                  Assigned Classes
                                </div>
                                <div className="mt-2 text-sm font-black text-slate-800">
                                  {editingStudent.assigned_count} active assignment(s)
                                </div>
                              </div>
                              <div className="rounded-2xl border border-slate-200 p-4">
                                <div className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                                  Login Protection
                                </div>
                                <div className="mt-2 text-sm font-black text-slate-800">
                                  One active device
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        {editTab === "notes" ? (
                          <div>
                            <h3 className="text-sm font-black text-slate-950">
                              Admin Notes
                            </h3>
                            <p className="mt-1 text-[10px] font-semibold text-slate-500">
                              Keep internal remarks about this student. These notes are not shown
                              in the Student Portal.
                            </p>
                            <textarea
                              rows={8}
                              value={editStudentDraft.remarks}
                              onChange={(event) =>
                                setEditStudentDraft((current) => ({
                                  ...current,
                                  remarks: event.target.value,
                                }))
                              }
                              placeholder="Add notes about this student…"
                              className="mt-4 w-full resize-y rounded-2xl border border-slate-300 bg-white p-4 text-sm outline-none transition focus:border-[#174699] focus:ring-4 focus:ring-blue-50"
                            />
                          </div>
                        ) : null}
                      </div>

                      <aside className="border-t border-slate-200 bg-slate-50/70 p-4 sm:p-5 lg:border-l lg:border-t-0">
                        <div className="sticky top-0 space-y-4">
                          <div>
                            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-[#174699]">
                              Quick Overview
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <div className="rounded-xl border border-slate-200 bg-white p-3">
                                <div className="text-lg font-black text-slate-950">
                                  {editingStudent.assigned_count}/{classes.length}
                                </div>
                                <div className="mt-1 text-[9px] font-bold text-slate-400">
                                  Assigned Classes
                                </div>
                              </div>
                              <div className="rounded-xl border border-slate-200 bg-white p-3">
                                <div className="text-sm font-black capitalize text-slate-950">
                                  {editingStudent.tier.replace("-", " + ")}
                                </div>
                                <div className="mt-1 text-[9px] font-bold text-slate-400">
                                  Material Access
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="text-xs font-black text-slate-800">
                              Profile Information
                            </div>
                            <dl className="mt-3 space-y-2 text-[10px]">
                              <div className="flex justify-between gap-3">
                                <dt className="font-semibold text-slate-400">Name</dt>
                                <dd className="text-right font-bold text-slate-700">
                                  {editStudentDraft.fullName}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-3">
                                <dt className="font-semibold text-slate-400">Email</dt>
                                <dd className="max-w-[190px] truncate text-right font-bold text-slate-700">
                                  {editStudentDraft.email}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-3">
                                <dt className="font-semibold text-slate-400">Mobile</dt>
                                <dd className="text-right font-bold text-slate-700">
                                  {editStudentDraft.phone}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-3">
                                <dt className="font-semibold text-slate-400">Batch</dt>
                                <dd className="text-right font-bold text-slate-700">
                                  {editStudentDraft.batch || "—"}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-3">
                                <dt className="font-semibold text-slate-400">Status</dt>
                                <dd
                                  className={
                                    editStudentDraft.accountStatus === "inactive"
                                      ? "font-black text-slate-500"
                                      : "font-black text-green-600"
                                  }
                                >
                                  {editStudentDraft.accountStatus === "inactive"
                                    ? "Inactive"
                                    : "Active"}
                                </dd>
                              </div>
                            </dl>
                          </div>

                          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                            <div className="text-xs font-black text-amber-800">
                              Security
                            </div>
                            <p className="mt-2 text-[9px] font-semibold leading-relaxed text-amber-700">
                              Passwords are never readable by administrators. To change one,
                              enter a new password in the Profile tab and save.
                            </p>
                          </div>

                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => {
                              setEditingStudent(null);
                              window.setTimeout(() => {
                                void deactivateStudent(editingStudent);
                              }, 0);
                            }}
                            className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-[10px] font-black text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            Clear Package / Class Access
                          </button>
                        </div>
                      </aside>
                    </div>

                    <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                      <div className="text-[9px] font-semibold text-slate-400">
                        Changes to email, password and account status take effect immediately after saving.
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => setEditingStudent(null)}
                          className="min-h-10 flex-1 rounded-xl border border-slate-300 bg-white px-5 text-xs font-black text-slate-700 sm:flex-none disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={saving || editLoading}
                          className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#174699] to-indigo-600 px-5 text-xs font-black text-white shadow-sm transition hover:brightness-105 sm:flex-none disabled:opacity-50"
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            ) : null}

            {message ? (
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-bold text-blue-800">
                {message}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                Show
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3"
                >
                  {[10, 20, 50, 100].map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={() => void load()}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#2f75bd] px-3 text-xs font-black text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Update
              </button>

              <div className="ml-auto flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilter("assigned")}
                  className={[
                    "rounded-lg border px-3 py-2 text-xs font-black",
                    filter === "assigned"
                      ? "border-green-500 bg-green-600 text-white"
                      : "border-green-300 bg-green-50 text-green-700",
                  ].join(" ")}
                >
                  Assigned Students
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("unassigned")}
                  className={[
                    "rounded-lg border px-3 py-2 text-xs font-black",
                    filter === "unassigned"
                      ? "border-orange-500 bg-orange-500 text-white"
                      : "border-orange-300 bg-orange-50 text-orange-700",
                  ].join(" ")}
                >
                  Unassigned Students
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={[
                    "rounded-lg border px-3 py-2 text-xs font-black",
                    filter === "all"
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-slate-300 bg-white text-slate-600",
                  ].join(" ")}
                >
                  All
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[1080px] border-collapse text-left text-[11px]">
                <thead className="bg-slate-50 text-slate-900">
                  <tr>
                    <th className="w-10 border-b px-3 py-3">#</th>
                    <th className="border-b px-3 py-3">Student ID</th>
                    <th className="border-b px-3 py-3">Student Name</th>
                    <th className="border-b px-3 py-3">Email</th>
                    <th className="border-b px-3 py-3">Mobile</th>
                    <th className="border-b px-3 py-3">Packages</th>
                    <th className="border-b px-3 py-3">Assigned Classes</th>
                    <th className="border-b px-3 py-3">Material Access</th>
                    <th className="border-b px-3 py-3">Reg. Date</th>
                    <th className="border-b px-3 py-3">Payment Mode</th>
                    <th className="border-b px-3 py-3">Status</th>
                    <th className="border-b px-3 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((student, index) => {
                    const active = selectedId === student.id;
                    const materialLabel =
                      student.tier === "free"
                        ? "Free"
                        : student.tier === "all-access"
                          ? "Free + Premium"
                          : "Premium";
                    return (
                      <tr
                        key={student.id}
                        onClick={() => setSelectedId(student.id)}
                        className={[
                          "cursor-pointer border-b border-slate-100 transition",
                          active ? "bg-blue-50/60" : "bg-white hover:bg-slate-50",
                        ].join(" ")}
                      >
                        <td className="px-3 py-3 font-bold">
                          {(currentPage - 1) * pageSize + index + 1}
                        </td>
                        <td className="px-3 py-3 font-black">{student.student_code || student.id.slice(0, 8)}</td>
                        <td className="px-3 py-3 font-black">{student.full_name}</td>
                        <td className="px-3 py-3">{student.email}</td>
                        <td className="px-3 py-3">{student.phone || "—"}</td>
                        <td className="px-3 py-3">{student.package_ids.length || 0}</td>
                        <td className="px-3 py-3 font-black">
                          {student.assigned_count}/{classes.length}
                        </td>
                        <td className="px-3 py-3">
                          <span className={[
                            "rounded-md border px-2 py-1 font-black",
                            student.tier === "free"
                              ? "border-green-200 bg-green-50 text-green-700"
                              : "border-blue-200 bg-blue-50 text-blue-700",
                          ].join(" ")}>
                            {materialLabel}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {new Date(student.created_at).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-3 py-3 capitalize">
                          {student.payment_source.replaceAll("_", " ")}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={[
                              "rounded-md px-2 py-1 font-black text-white",
                              student.account_status === "inactive"
                                ? "bg-slate-500"
                                : "bg-green-600",
                            ].join(" ")}
                          >
                            {student.account_status === "inactive" ? "Inactive" : "Active"}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <ActionButton title="View student" onClick={() => setSelectedId(student.id)}>
                              <Eye className="h-3.5 w-3.5" />
                            </ActionButton>
                            <ActionButton title="Assign packages/classes" onClick={() => setSelectedId(student.id)}>
                              <Users className="h-3.5 w-3.5" />
                            </ActionButton>
                            <ActionButton title="Edit student" tone="orange" onClick={() => void openEditStudent(student)}>
                              <Edit3 className="h-3.5 w-3.5" />
                            </ActionButton>
                            <ActionButton title="Open access control" tone="blue" onClick={() => setSelectedId(student.id)}>
                              <LockKeyhole className="h-3.5 w-3.5" />
                            </ActionButton>
                            <ActionButton title="Clear package/class access" tone="red" onClick={() => void deactivateStudent(student)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </ActionButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {!visible.length ? (
                <div className="p-10 text-center text-sm font-semibold text-slate-500">
                  No students match the current filter.
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {filtered.length ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
                {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} entries
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="grid h-9 w-9 place-items-center rounded-lg border disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="grid h-9 min-w-9 place-items-center rounded-lg bg-[#2e72d2] px-3 font-black text-white">
                  {currentPage}
                </div>
                <button
                  disabled={currentPage >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  className="grid h-9 w-9 place-items-center rounded-lg border disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ["Total Students", students.length, "All Registered", "bg-blue-50 text-blue-700"],
                ["Assigned Students", assignedCount, "Have Class Access", "bg-green-50 text-green-700"],
                ["Unassigned Students", unassignedCount, "No Class Assigned", "bg-orange-50 text-orange-700"],
                ["Active Students", students.length, "Currently Active", "bg-purple-50 text-purple-700"],
                ["Pending Students", 0, "Awaiting Activation", "bg-sky-50 text-sky-700"],
              ].map(([label, value, detail, tone]) => (
                <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${tone}`}>{label}</div>
                  <div className="mt-3 text-2xl font-black">{value}</div>
                  <div className="mt-1 text-[11px] font-semibold text-slate-500">{detail}</div>
                </div>
              ))}
            </div>
          </section>

          <aside className="min-h-[760px] bg-white p-4 lg:p-5">
            <div className="sticky top-[125px]">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black">Assign Packages & Access</h2>
                <button
                  type="button"
                  onClick={() => setSelectedId("")}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
                  aria-label="Close assignment panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {selected ? (
                <div className="mt-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-sm font-black text-slate-700">
                        {selected.full_name
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((x) => x[0])
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-black text-[#174699]">{selected.full_name}</div>
                          <span className="rounded bg-green-600 px-1.5 py-0.5 text-[9px] font-black text-white">Active</span>
                        </div>
                        <div className="mt-1 text-[10px] font-semibold text-slate-600">
                          Student ID: {selected.student_code || selected.id.slice(0, 8)} · {selected.phone || "No phone"}
                        </div>
                        <div className="mt-1 truncate text-[10px] text-slate-500">
                          Email: {selected.email}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 border-b border-slate-200 pb-4">
                    <div className="mb-2 text-xs font-black text-[#174699]">1. Package Assignment</div>
                    <div className="grid max-h-32 grid-cols-2 gap-x-3 gap-y-2 overflow-y-auto pr-1">
                      {courses.map((course) => (
                        <label key={course.id} className="flex items-start gap-2 text-[11px] font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={draft.packageIds.includes(course.id)}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                packageIds: event.target.checked
                                  ? [...current.packageIds, course.id]
                                  : current.packageIds.filter((id) => id !== course.id),
                              }))
                            }
                            className="mt-0.5"
                          />
                          <span>{course.title}</span>
                        </label>
                      ))}
                    </div>
                    <div className="mt-2 text-[10px] font-bold text-slate-500">
                      Selected Packages: {draft.packageIds.length}
                    </div>
                  </div>

                  <div className="mt-4 border-b border-slate-200 pb-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-black text-[#174699]">2. Live / Teleclass Assignment</div>
                      <div className="text-[10px] font-bold text-blue-600">
                        Assigned {draft.classIds.length} of {classes.length} classes
                      </div>
                    </div>
                    <div className="mt-2 grid max-h-40 grid-cols-2 gap-x-3 gap-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2.5">
                      {classes.map((liveClass) => (
                        <label key={liveClass.id} className="flex items-start gap-2 text-[10px] font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={draft.classIds.includes(liveClass.id)}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                classIds: event.target.checked
                                  ? [...current.classIds, liveClass.id]
                                  : current.classIds.filter((id) => id !== liveClass.id),
                              }))
                            }
                            className="mt-0.5"
                          />
                          <span>
                            {liveClass.title}
                            {liveClass.topic ? ` — ${liveClass.topic}` : ""}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 border-b border-slate-200 pb-4">
                    <div className="text-xs font-black text-[#174699]">3. Study Material Access</div>
                    <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                      <div className="rounded-lg border border-green-200 bg-green-50/40 p-3">
                        <div className="text-[10px] font-black text-green-700">Free Material (Visible to All)</div>
                        <div className="mt-2 space-y-2">
                          {FREE_MATERIALS.map((item) => (
                            <div key={item} className="flex items-center gap-2 text-[10px] font-semibold text-slate-700">
                              <Check className="h-3.5 w-3.5 text-green-600" />
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-lg border border-orange-200 bg-orange-50/40 p-3">
                        <div className="text-[10px] font-black text-orange-700">Premium Material (Restricted)</div>
                        <div className="mt-2 space-y-2">
                          {PREMIUM_FLAGS.map(([key, label]) => (
                            <Toggle
                              key={key}
                              label={label}
                              checked={draft.materialFlags[key] === true}
                              onChange={(checked) =>
                                setDraft((current) => ({
                                  ...current,
                                  materialFlags: {
                                    ...current.materialFlags,
                                    [key]: checked,
                                  },
                                  tier: checked && current.tier === "free" ? "premium" : current.tier,
                                }))
                              }
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-[9px] font-semibold leading-relaxed text-orange-800">
                      Premium material can remain visible but locked. Students without access see:
                      {" "}
                      <b>Contact Help Desk for access — {SITE_CONTACT.helpdeskEmail}</b>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-slate-600">
                      Material tier:
                      <select
                        value={draft.tier}
                        onChange={(e) => setDraft((current) => ({ ...current, tier: e.target.value }))}
                        className="rounded-md border border-slate-300 bg-white px-2 py-1"
                      >
                        <option value="free">Free</option>
                        <option value="premium">Premium</option>
                        <option value="all-access">Free + Premium</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 border-b border-slate-200 pb-4">
                    <div className="text-xs font-black text-[#174699]">4. Payment / Enrollment Source</div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-700">
                      {[
                        ["cash_counter", "Cash Counter"],
                        ["phone_booking", "Phone Booking"],
                        ["manual_admin", "Manual Admin"],
                        ["online_gateway", "Online Payment Gateway"],
                      ].map(([value, label]) => (
                        <label key={value} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="payment-source"
                            checked={draft.paymentSource === value}
                            onChange={() => setDraft((current) => ({ ...current, paymentSource: value as PaymentSource }))}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 border-b border-slate-200 pb-4">
                    <div className="text-xs font-black text-[#174699]">5. Reminder / Notification Preferences</div>
                    <div className="mt-2 space-y-2">
                      <Toggle
                        label="WhatsApp reminder"
                        checked={draft.whatsappOptIn}
                        onChange={(checked) => setDraft((current) => ({ ...current, whatsappOptIn: checked }))}
                      />
                      <div className="grid grid-cols-2 gap-2 pl-1 text-[10px] font-semibold text-slate-700">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={draft.reminderDayBefore}
                            onChange={(e) => setDraft((current) => ({ ...current, reminderDayBefore: e.target.checked }))}
                          />
                          1 day before
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={draft.reminderHourBefore}
                            onChange={(e) => setDraft((current) => ({ ...current, reminderHourBefore: e.target.checked }))}
                          />
                          1 hour before
                        </label>
                      </div>
                      <Toggle
                        label="SMS reminder"
                        checked={draft.smsEnabled}
                        onChange={(checked) => setDraft((current) => ({ ...current, smsEnabled: checked }))}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void saveAssignment(false)}
                      className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg bg-[#2e72d2] px-2 text-[10px] font-black text-white disabled:opacity-60"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save Assignment
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void saveAssignment(true)}
                      className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg bg-green-600 px-2 text-[10px] font-black text-white disabled:opacity-60"
                    >
                      <PackageCheck className="h-3.5 w-3.5" />
                      Assign All Selected
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void sendConfirmation()}
                      className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg bg-orange-500 px-2 text-[10px] font-black text-white disabled:opacity-60"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Send Confirmation
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <Users className="mx-auto h-8 w-8 text-slate-300" />
                  <div className="mt-3 text-sm font-black text-slate-700">Select a student</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    Choose a row to assign packages, classes and premium access.
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}




