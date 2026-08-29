"use client";

import * as React from "react";
import {
  BookOpen,
  CheckCircle2,
  KeyRound,
  Loader2,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
} from "lucide-react";

export function TeacherProfileWorkspace() {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [contact, setContact] = React.useState<any>({});

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/teacher/profile", {
        cache: "no-store",
      });
      const next = await response.json();
      if (!response.ok || !next.ok) {
        throw new Error(next.error || "Unable to load profile.");
      }
      setData(next);
      setContact({
        phone: next.profile?.phone || "",
        avatar_url: next.profile?.avatar_url || "",
        ...(next.teacherProfile || {}),
      });
    } catch (error: any) {
      setMessage(error?.message || "Unable to load profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function updateContact() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_contact",
          profile: {
            phone: contact.phone,
            avatar_url: contact.avatar_url,
          },
          teacherProfile: contact,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Unable to save profile.");
      }
      setMessage("Profile updated.");
      await load();
    } catch (error: any) {
      setMessage(error?.message || "Unable to save profile.");
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change_password",
          password,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Unable to change password.");
      }
      setPassword("");
      setMessage("Password changed successfully.");
    } catch (error: any) {
      setMessage(error?.message || "Unable to change password.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[55vh] place-items-center">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (data?.adminPreview) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Administrator preview is active. Open a real teacher account to edit a
        teacher&apos;s own profile workspace.
      </div>
    );
  }

  const profile = data?.profile || {};
  const courses = data?.courses || [];
  const permissions = data?.permissions || {};

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.17em] text-indigo-600">
          Teacher Portal
        </div>
        <h1 className="mt-1 text-2xl font-black">My Profile & Workspace</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your staff information, assigned courses, contact details and account
          security.
        </p>
      </div>

      {message ? (
        <div className="flex items-center gap-2 rounded-2xl bg-blue-50 p-4 text-xs font-bold text-blue-800">
          <CheckCircle2 className="h-4 w-4" />
          {message}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-[#102968] text-xl font-black text-white">
            {String(profile.full_name || "T")
              .split(/\s+/)
              .slice(0, 2)
              .map((part: string) => part[0])
              .join("")
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black">{profile.full_name}</h2>
            <div className="mt-1 text-sm text-slate-500">
              {contact.specialization || "Instructor"}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black">
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700">
                {contact.staff_code || "Teacher"}
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                {contact.employment_status || "active"}
              </span>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
            <div className="font-black text-slate-800">{profile.email}</div>
            <div className="mt-1">Individual Staff Login</div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-indigo-600" />
              <div>
                <h3 className="font-black">Contact Information</h3>
                <p className="text-[10px] text-slate-400">
                  Update your own phone, address and emergency details.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {[
                ["Phone", "phone"],
                ["Alternate Phone", "alternate_phone"],
                ["Address", "address_line1"],
                ["Address Line 2", "address_line2"],
                ["City", "city"],
                ["State", "state_region"],
                ["Postal Code", "postal_code"],
                ["Country", "country"],
                ["Emergency Contact", "emergency_contact_name"],
                ["Emergency Relation", "emergency_contact_relation"],
                ["Emergency Phone", "emergency_contact_phone"],
              ].map(([label, key]) => (
                <label
                  key={key}
                  className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500"
                >
                  {label}
                  <input
                    value={contact[key] || ""}
                    onChange={(event) =>
                      setContact({
                        ...contact,
                        [key]: event.target.value,
                      })
                    }
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold normal-case tracking-normal outline-none focus:border-indigo-500"
                  />
                </label>
              ))}
            </div>

            <label className="mt-4 block text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
              Bio / About
              <textarea
                rows={4}
                value={contact.bio || ""}
                onChange={(event) =>
                  setContact({ ...contact, bio: event.target.value })
                }
                className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs font-semibold normal-case tracking-normal outline-none focus:border-indigo-500"
              />
            </label>

            <button
              type="button"
              onClick={updateContact}
              disabled={busy}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-xs font-black text-white disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Save My Profile
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              <div>
                <h3 className="font-black">My Assigned Courses</h3>
                <p className="text-[10px] text-slate-400">
                  Course assignment is controlled by an administrator.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {courses.map((course: any) => (
                <div
                  key={course.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="text-xs font-black">{course.title}</div>
                  <div className="mt-1 text-[10px] text-slate-400">
                    {course.category || "course"} · {course.level || "standard"}
                  </div>
                </div>
              ))}

              {!courses.length ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-xs text-slate-400">
                  No course has been assigned yet.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
              <h3 className="font-black">My Access</h3>
            </div>
            <div className="mt-4 space-y-2">
              {Object.entries(permissions)
                .filter(([key]) => key.startsWith("can_"))
                .map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-xs"
                  >
                    <span className="font-bold">
                      {key
                        .replace(/^can_/, "")
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (letter) => letter.toUpperCase())}
                    </span>
                    <span
                      className={`font-black ${
                        value ? "text-emerald-600" : "text-slate-400"
                      }`}
                    >
                      {value ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <KeyRound className="h-5 w-5 text-indigo-600" />
              <div>
                <h3 className="font-black">Change Password</h3>
                <p className="text-[10px] text-slate-400">
                  Use at least 8 characters.
                </p>
              </div>
            </div>

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="New password"
              className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
            />
            <button
              type="button"
              onClick={changePassword}
              disabled={busy || password.length < 8}
              className="mt-3 w-full rounded-xl bg-[#102968] py-3 text-xs font-black text-white disabled:opacity-40"
            >
              Change Password
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 text-indigo-600" />
              <div>
                <h3 className="font-black">Professional Record</h3>
                <div className="mt-3 space-y-2 text-xs text-slate-500">
                  <div>
                    <span className="font-black text-slate-700">
                      Qualification:
                    </span>{" "}
                    {contact.qualification || "Not recorded"}
                  </div>
                  <div>
                    <span className="font-black text-slate-700">
                      Specialization:
                    </span>{" "}
                    {contact.specialization || "Not recorded"}
                  </div>
                  <div>
                    <span className="font-black text-slate-700">
                      Joining Date:
                    </span>{" "}
                    {contact.joining_date || "Not recorded"}
                  </div>
                </div>
                <p className="mt-4 text-[10px] leading-5 text-slate-400">
                  Professional fields are maintained by Administration. Contact
                  details and bio can be updated by the teacher.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
