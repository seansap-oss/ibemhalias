"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  BookOpen,
  Check,
  ClipboardList,
  Copy,
  DatabaseBackup,
  Edit3,
  KeyRound,
  Loader2,
  NotebookPen,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";

type Course = {
  id: string;
  title: string;
  slug?: string;
  category?: string;
  level?: string;
  instructor_id?: string | null;
  is_published?: boolean;
};

type TeacherRecord = {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  avatar_url?: string | null;
  course_ids: string[];
  teacher_profile: Record<string, any>;
  permissions: Record<string, boolean>;
  notes: any[];
  activity: any[];
};

const permissionLabels: Record<string, string> = {
  can_live_classes: "Live Classes",
  can_schedule_classes: "Schedule Classes",
  can_teacher_studio: "Teacher Studio",
  can_study_materials: "Study Materials",
  can_upload_materials: "Upload Materials",
  can_attendance: "Attendance",
  can_mock_tests: "Mock Tests",
  can_view_student_contacts: "Student Contacts",
};

const emptyNewTeacher = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  alternate_phone: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state_region: "",
  postal_code: "",
  country: "India",
  emergency_contact_name: "",
  emergency_contact_relation: "",
  emergency_contact_phone: "",
  qualification: "",
  specialization: "",
  joining_date: "",
  bio: "",
};

function initials(name: string) {
  return String(name || "T")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1))
    .join("")
    .toUpperCase();
}

function statusOf(teacher: TeacherRecord) {
  return String(teacher.teacher_profile?.employment_status || "active");
}

export function TeacherManagement() {
  const [teachers, setTeachers] = React.useState<TeacherRecord[]>([]);
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [tab, setTab] = React.useState<
    "profile" | "assignments" | "permissions" | "notes" | "activity"
  >("profile");
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [migrationRequired, setMigrationRequired] = React.useState(false);
  const [showCreate, setShowCreate] = React.useState(false);
  const [showReset, setShowReset] = React.useState(false);
  const [temporary, setTemporary] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [note, setNote] = React.useState("");
  const [notePriority, setNotePriority] = React.useState("normal");
  const [newTeacher, setNewTeacher] = React.useState(emptyNewTeacher);
  const [editProfile, setEditProfile] = React.useState<Record<string, any>>({});
  const [editCourses, setEditCourses] = React.useState<string[]>([]);
  const [editPermissions, setEditPermissions] =
    React.useState<Record<string, boolean>>({});

  const selected =
    teachers.find((teacher) => teacher.id === selectedId) || teachers[0] || null;

  const load = React.useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/teachers", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to load Teacher CRM.");
      }

      const nextTeachers = data.teachers || [];
      setTeachers(nextTeachers);
      setCourses(data.courses || []);
      setMigrationRequired(Boolean(data.migrationRequired));

      if (!selectedId && nextTeachers[0]?.id) {
        setSelectedId(nextTeachers[0].id);
      }
    } catch (error: any) {
      setMessage(error?.message || "Unable to load Teacher CRM.");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!selected) return;
    setEditProfile({
      full_name: selected.full_name || "",
      phone: selected.phone || "",
      avatar_url: selected.avatar_url || "",
      ...(selected.teacher_profile || {}),
    });
    setEditCourses(selected.course_ids || []);
    setEditPermissions(selected.permissions || {});
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = teachers.filter((teacher) => {
    const text = `${teacher.full_name} ${teacher.email} ${
      teacher.teacher_profile?.staff_code || ""
    } ${teacher.teacher_profile?.specialization || ""}`.toLowerCase();

    return (
      text.includes(search.toLowerCase()) &&
      (statusFilter === "all" || statusOf(teacher) === statusFilter)
    );
  });

  async function patch(body: Record<string, any>) {
    setBusy(true);
    setMessage("");
    setTemporary("");

    try {
      const response = await fetch("/api/admin/teachers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        if (data.migrationRequired) setMigrationRequired(true);
        throw new Error(data.error || "Unable to update teacher.");
      }

      if (data.temporaryPassword) {
        setTemporary(data.temporaryPassword);
      }

      await load();
      return data;
    } catch (error: any) {
      setMessage(error?.message || "Unable to update teacher.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function createTeacher(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setTemporary("");

    try {
      const response = await fetch("/api/admin/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: newTeacher.fullName,
          email: newTeacher.email,
          phone: newTeacher.phone,
          password: newTeacher.password,
          courseIds: [],
          teacherProfile: {
            alternate_phone: newTeacher.alternate_phone,
            address_line1: newTeacher.address_line1,
            address_line2: newTeacher.address_line2,
            city: newTeacher.city,
            state_region: newTeacher.state_region,
            postal_code: newTeacher.postal_code,
            country: newTeacher.country,
            emergency_contact_name: newTeacher.emergency_contact_name,
            emergency_contact_relation: newTeacher.emergency_contact_relation,
            emergency_contact_phone: newTeacher.emergency_contact_phone,
            qualification: newTeacher.qualification,
            specialization: newTeacher.specialization,
            joining_date: newTeacher.joining_date || null,
            bio: newTeacher.bio,
            employment_status: "active",
          },
          permissions: {},
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        if (data.migrationRequired) setMigrationRequired(true);
        throw new Error(data.error || "Unable to create teacher.");
      }

      setTemporary(data.temporaryPassword || "");
      setNewTeacher(emptyNewTeacher);
      setShowCreate(false);
      await load();

      if (data.teacherId) {
        setSelectedId(data.teacherId);
      }

      setMessage("Teacher account created successfully.");
    } catch (error: any) {
      setMessage(error?.message || "Unable to create teacher.");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !teachers.length) {
    return (
      <div className="grid min-h-[55vh] place-items-center">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-600 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading Teacher CRM…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.17em] text-[#3155c6]">
            Ibemhal Staff Database
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-950">
            Teacher Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Profiles, assignments, permissions, private notes and audit history
            in one Ibemhal workspace.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/data-vault"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700"
          >
            <DatabaseBackup className="h-4 w-4" />
            Local Data Vault
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#3155c6] px-4 text-xs font-black text-white"
          >
            <UserRound className="h-4 w-4" />
            Add Teacher
          </button>
        </div>
      </div>

      {migrationRequired ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="font-black">Teacher CRM database setup required</div>
          <div className="mt-1 text-xs leading-5">
            Apply{" "}
            <code className="font-black">
              supabase/migrations/014_teacher_crm_staff_database.sql
            </code>{" "}
            once. Existing students, courses and teachers are preserved.
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-bold text-blue-800">
          {message}
        </div>
      ) : null}

      {temporary ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
              One-time password
            </div>
            <code className="mt-1 block break-all text-sm font-black text-emerald-950">
              {temporary}
            </code>
          </div>
          <button
            type="button"
            onClick={() =>
              navigator.clipboard.writeText(temporary).catch(() => undefined)
            }
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-black text-emerald-800"
          >
            <Copy className="h-4 w-4" />
            Copy
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-black">Teacher Directory</div>
              <div className="text-[10px] font-bold text-slate-400">
                {teachers.length} staff records
              </div>
            </div>
            <Users className="h-4 w-4 text-[#3155c6]" />
          </div>

          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email or staff ID"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#3155c6]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold"
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="leave">On leave</option>
            <option value="archived">Archived</option>
          </select>

          <div className="mt-3 max-h-[690px] space-y-2 overflow-y-auto pr-1">
            {filtered.map((teacher) => {
              const active = selected?.id === teacher.id;
              const status = statusOf(teacher);

              return (
                <button
                  key={teacher.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(teacher.id);
                    setTab("profile");
                  }}
                  className={`w-full rounded-2xl border p-3 text-left transition ${
                    active
                      ? "border-[#3155c6] bg-indigo-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#102968] text-xs font-black text-white">
                      {initials(teacher.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-black">
                        {teacher.full_name}
                      </div>
                      <div className="mt-1 truncate text-[10px] text-slate-500">
                        {teacher.teacher_profile?.specialization ||
                          teacher.email}
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="text-[9px] font-black text-[#3155c6]">
                          {teacher.teacher_profile?.staff_code ||
                            `TC-${teacher.id.slice(0, 6)}`}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase ${
                            status === "active"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {status}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="min-w-0">
          {selected ? (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#102968] text-lg font-black text-white">
                    {initials(selected.full_name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-black">{selected.full_name}</h2>
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-black uppercase text-[#3155c6]">
                        Instructor
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {selected.teacher_profile?.specialization ||
                        "Teaching Staff"}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-bold text-slate-400">
                      <span>
                        Staff ID:{" "}
                        {selected.teacher_profile?.staff_code ||
                          `TC-${selected.id.slice(0, 6)}`}
                      </span>
                      <span>{selected.email}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNewPassword("");
                        setShowReset(true);
                      }}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-black"
                    >
                      <KeyRound className="h-4 w-4" />
                      Reset Password
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void patch({
                          teacherId: selected.id,
                          action: "set_status",
                          status:
                            statusOf(selected) === "active"
                              ? "inactive"
                              : "active",
                        })
                      }
                      className={`inline-flex min-h-10 items-center rounded-xl px-3 text-xs font-black ${
                        statusOf(selected) === "active"
                          ? "bg-red-50 text-red-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {statusOf(selected) === "active"
                        ? "Deactivate"
                        : "Reactivate"}
                    </button>
                  </div>
                </div>

                <div className="mt-5 flex gap-1 overflow-x-auto border-b border-slate-100">
                  {[
                    ["profile", "Profile", UserRound],
                    ["assignments", "Assignments", BookOpen],
                    ["permissions", "Permissions", ShieldCheck],
                    ["notes", "Notes", NotebookPen],
                    ["activity", "Activity Log", Activity],
                  ].map(([value, label, Icon]: any) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTab(value)}
                      className={`inline-flex min-h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-[11px] font-black ${
                        tab === value
                          ? "border-[#3155c6] text-[#3155c6]"
                          : "border-transparent text-slate-500"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-5">
                {tab === "profile" ? (
                  <ProfileTab
                    profile={editProfile}
                    setProfile={setEditProfile}
                    busy={busy}
                    disabled={migrationRequired}
                    onSave={() =>
                      void patch({
                        teacherId: selected.id,
                        action: "update_profile",
                        profile: editProfile,
                      })
                    }
                  />
                ) : null}

                {tab === "assignments" ? (
                  <AssignmentTab
                    courses={courses}
                    selected={editCourses}
                    setSelected={setEditCourses}
                    busy={busy}
                    onSave={() =>
                      void patch({
                        teacherId: selected.id,
                        action: "assign_courses",
                        courseIds: editCourses,
                      })
                    }
                  />
                ) : null}

                {tab === "permissions" ? (
                  <PermissionTab
                    permissions={editPermissions}
                    setPermissions={setEditPermissions}
                    busy={busy}
                    disabled={migrationRequired}
                    onSave={() =>
                      void patch({
                        teacherId: selected.id,
                        action: "update_permissions",
                        permissions: editPermissions,
                      })
                    }
                  />
                ) : null}

                {tab === "notes" ? (
                  <NotesTab
                    notes={selected.notes || []}
                    note={note}
                    setNote={setNote}
                    priority={notePriority}
                    setPriority={setNotePriority}
                    busy={busy}
                    disabled={migrationRequired}
                    onAdd={async () => {
                      const result = await patch({
                        teacherId: selected.id,
                        action: "add_note",
                        note,
                        priority: notePriority,
                      });
                      if (result) setNote("");
                    }}
                  />
                ) : null}

                {tab === "activity" ? (
                  <ActivityTab activity={selected.activity || []} />
                ) : null}
              </div>
            </div>
          ) : (
            <div className="grid min-h-[500px] place-items-center rounded-3xl border border-dashed border-slate-300 bg-white">
              <div className="text-center text-sm font-black text-slate-500">
                Add your first teacher.
              </div>
            </div>
          )}
        </section>
      </div>

      {showCreate ? (
        <CreateTeacherModal
          form={newTeacher}
          setForm={setNewTeacher}
          busy={busy}
          disabled={migrationRequired}
          onClose={() => setShowCreate(false)}
          onSubmit={createTeacher}
        />
      ) : null}

      {showReset && selected ? (
        <div className="fixed inset-0 z-[310] grid place-items-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black">Reset Teacher Password</h2>
              <button
                type="button"
                onClick={() => setShowReset(false)}
                className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Leave blank to generate a strong temporary password.
            </p>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
              placeholder="New password (optional)"
            />
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                const result = await patch({
                  teacherId: selected.id,
                  action: "reset_password",
                  password: newPassword,
                });
                if (result) setShowReset(false);
              }}
              className="mt-4 w-full rounded-xl bg-[#102968] py-3 text-xs font-black text-white disabled:opacity-50"
            >
              Reset Password
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProfileTab({
  profile,
  setProfile,
  busy,
  disabled,
  onSave,
}: any) {
  const fields = [
    ["Full Name", "full_name"],
    ["Phone", "phone"],
    ["Alternate Phone", "alternate_phone"],
    ["Staff Code", "staff_code"],
    ["Qualification", "qualification"],
    ["Specialization", "specialization"],
    ["Joining Date", "joining_date", "date"],
    ["Address", "address_line1"],
    ["Address Line 2", "address_line2"],
    ["City", "city"],
    ["State", "state_region"],
    ["Postal Code", "postal_code"],
    ["Country", "country"],
    ["Emergency Contact", "emergency_contact_name"],
    ["Emergency Relation", "emergency_contact_relation"],
    ["Emergency Phone", "emergency_contact_phone"],
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black">Personal & Professional Information</h3>
          <p className="text-[10px] text-slate-400">
            The Ibemhal master staff record.
          </p>
        </div>
        <Edit3 className="h-4 w-4 text-[#3155c6]" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {fields.map(([label, key, type]) => (
          <label
            key={key}
            className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500"
          >
            {label}
            <input
              type={type || "text"}
              value={profile[key] || ""}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  [key]: event.target.value,
                })
              }
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-[#3155c6]"
            />
          </label>
        ))}
      </div>

      <label className="block text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
        Bio / About
        <textarea
          rows={4}
          value={profile.bio || ""}
          onChange={(event) =>
            setProfile({
              ...profile,
              bio: event.target.value,
            })
          }
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold normal-case tracking-normal outline-none focus:border-[#3155c6]"
        />
      </label>

      <button
        type="button"
        disabled={busy || disabled}
        onClick={onSave}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#3155c6] px-5 text-xs font-black text-white disabled:opacity-40"
      >
        <Save className="h-4 w-4" />
        Save Profile
      </button>
    </div>
  );
}

function AssignmentTab({
  courses,
  selected,
  setSelected,
  busy,
  onSave,
}: any) {
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="font-black">Assigned Courses</h3>
          <p className="text-[10px] text-slate-400">
            Only these courses appear in this teacher&apos;s portal.
          </p>
        </div>
        <span className="text-[10px] font-black text-[#3155c6]">
          {selected.length} selected
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {courses.map((course: Course) => (
          <label
            key={course.id}
            className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${
              selected.includes(course.id)
                ? "border-[#3155c6] bg-indigo-50"
                : "border-slate-200"
            }`}
          >
            <input
              type="checkbox"
              className="mt-1"
              checked={selected.includes(course.id)}
              onChange={(event) =>
                setSelected(
                  event.target.checked
                    ? [...selected, course.id]
                    : selected.filter((id: string) => id !== course.id)
                )
              }
            />
            <div>
              <div className="text-xs font-black">{course.title}</div>
              <div className="mt-1 text-[10px] text-slate-400">
                {course.category || "course"} · {course.level || "standard"}
              </div>
            </div>
          </label>
        ))}
      </div>

      {!courses.length ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-xs text-amber-800">
          No course records are available.{" "}
          <Link href="/admin/courses" className="font-black underline">
            Open Course Manager
          </Link>
          .
        </div>
      ) : null}

      <button
        type="button"
        disabled={busy || !courses.length}
        onClick={onSave}
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#3155c6] px-5 text-xs font-black text-white disabled:opacity-40"
      >
        <Save className="h-4 w-4" />
        Save Course Assignments
      </button>
    </div>
  );
}

function PermissionTab({
  permissions,
  setPermissions,
  busy,
  disabled,
  onSave,
}: any) {
  return (
    <div>
      <h3 className="font-black">Access Control</h3>
      <p className="mt-1 text-[10px] text-slate-400">
        Control exactly what this teacher can access.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {Object.entries(permissionLabels).map(([key, label]) => (
          <label
            key={key}
            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4"
          >
            <span className="text-xs font-black">{label}</span>
            <input
              type="checkbox"
              checked={Boolean(permissions[key])}
              onChange={(event) =>
                setPermissions({
                  ...permissions,
                  [key]: event.target.checked,
                })
              }
              className="h-4 w-4"
            />
          </label>
        ))}
      </div>

      <button
        type="button"
        disabled={busy || disabled}
        onClick={onSave}
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#3155c6] px-5 text-xs font-black text-white disabled:opacity-40"
      >
        <Save className="h-4 w-4" />
        Save Permissions
      </button>
    </div>
  );
}

function NotesTab({
  notes,
  note,
  setNote,
  priority,
  setPriority,
  busy,
  disabled,
  onAdd,
}: any) {
  return (
    <div>
      <h3 className="font-black">Teacher Notes / CRM Record</h3>
      <p className="mt-1 text-[10px] text-slate-400">
        Private administrator notes are never shown to the teacher.
      </p>

      <div className="mt-4 rounded-2xl border border-slate-200 p-4">
        <textarea
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Performance notes, follow-up information, availability, feedback…"
          className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-[#3155c6]"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <button
            type="button"
            disabled={busy || !note.trim() || disabled}
            onClick={onAdd}
            className="rounded-xl bg-[#3155c6] px-4 py-2 text-xs font-black text-white disabled:opacity-40"
          >
            Add Private Note
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {notes.map((item: any) => (
          <div
            key={item.id}
            className="rounded-2xl border border-slate-200 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase">
                {item.priority}
              </span>
              <span className="text-[9px] text-slate-400">
                {new Date(item.created_at).toLocaleString()}
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-700">
              {item.note}
            </p>
          </div>
        ))}

        {!notes.length ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
            No CRM notes for this teacher.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ActivityTab({ activity }: any) {
  return (
    <div>
      <h3 className="font-black">Recent Activity / Audit Log</h3>
      <div className="mt-4 space-y-2">
        {activity.map((item: any) => (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4"
          >
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-indigo-50 text-[#3155c6]">
              <ClipboardList className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black">
                {String(item.action || "").replace(/_/g, " ")}
              </div>
              <div className="mt-1 text-[9px] text-slate-400">
                {new Date(item.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        ))}

        {!activity.length ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
            Activity will appear after profile, course, permission, password or
            status changes.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CreateTeacherModal({
  form,
  setForm,
  busy,
  disabled,
  onClose,
  onSubmit,
}: any) {
  const fields = [
    ["Full Name", "fullName"],
    ["Email", "email", "email"],
    ["Phone", "phone"],
    ["Alternate Phone", "alternate_phone"],
    ["Password (optional)", "password", "password"],
    ["Qualification", "qualification"],
    ["Specialization", "specialization"],
    ["Joining Date", "joining_date", "date"],
    ["Address", "address_line1"],
    ["Address Line 2", "address_line2"],
    ["City", "city"],
    ["State", "state_region"],
    ["Postal Code", "postal_code"],
    ["Country", "country"],
    ["Emergency Contact", "emergency_contact_name"],
    ["Emergency Relation", "emergency_contact_relation"],
    ["Emergency Phone", "emergency_contact_phone"],
  ];

  return (
    <div className="fixed inset-0 z-[300] grid place-items-center bg-slate-950/60 p-4">
      <form
        onSubmit={onSubmit}
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-[#3155c6]">
              New Staff Record
            </div>
            <h2 className="mt-1 text-xl font-black">Add Teacher</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {fields.map(([label, key, type]) => (
            <label
              key={key}
              className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500"
            >
              {label}
              <input
                type={type || "text"}
                required={key === "fullName" || key === "email"}
                value={form[key] || ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    [key]: event.target.value,
                  })
                }
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold normal-case tracking-normal outline-none focus:border-[#3155c6]"
              />
            </label>
          ))}
        </div>

        <label className="mt-4 block text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
          Bio / About
          <textarea
            rows={3}
            value={form.bio}
            onChange={(event) =>
              setForm({ ...form, bio: event.target.value })
            }
            className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs font-semibold normal-case tracking-normal outline-none focus:border-[#3155c6]"
          />
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || disabled}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#3155c6] px-5 text-xs font-black text-white disabled:opacity-40"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Create Teacher
          </button>
        </div>
      </form>
    </div>
  );
}
