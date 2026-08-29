"use client";

import * as React from "react";
import { CalendarPlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

type Course = { id: string; title: string };

export function TeacherScheduleForm({
  courses,
}: {
  courses: Course[];
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [createdId, setCreatedId] = React.useState("");
  const [form, setForm] = React.useState({
    title: "",
    topic: "",
    courseId: courses[0]?.id || "",
    startsAt: "",
    endsAt: "",
    capacity: 500,
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setCreatedId("");

    try {
      const response = await fetch("/api/teacher/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to schedule class.");
      }

      setMessage("Class scheduled and eligible students assigned.");
      setCreatedId(data.liveClass.id);
      router.refresh();
    } catch (error: any) {
      setMessage(error?.message || "Unable to schedule class.");
    } finally {
      setBusy(false);
    }
  };

  if (!courses.length) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
        <div className="font-black text-amber-900">No assigned course</div>
        <p className="mt-2 text-xs leading-5 text-amber-800">
          An administrator must assign at least one course to this teacher before
          the teacher can schedule a class.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
          <CalendarPlus className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-black">Schedule Live Class</h2>
          <p className="text-xs text-slate-500">
            Only your assigned courses are available.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-xs font-black text-slate-600">
          Class title
          <input
            required
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
        </label>

        <label className="text-xs font-black text-slate-600">
          Topic
          <input
            required
            value={form.topic}
            onChange={(event) => setForm({ ...form, topic: event.target.value })}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
        </label>

        <label className="text-xs font-black text-slate-600 md:col-span-2">
          Course
          <select
            required
            value={form.courseId}
            onChange={(event) =>
              setForm({ ...form, courseId: event.target.value })
            }
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-black text-slate-600">
          Starts
          <input
            type="datetime-local"
            required
            value={form.startsAt}
            onChange={(event) =>
              setForm({ ...form, startsAt: event.target.value })
            }
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
        </label>

        <label className="text-xs font-black text-slate-600">
          Ends
          <input
            type="datetime-local"
            value={form.endsAt}
            onChange={(event) =>
              setForm({ ...form, endsAt: event.target.value })
            }
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
        </label>

        <label className="text-xs font-black text-slate-600">
          Capacity
          <input
            type="number"
            min={1}
            max={1000}
            value={form.capacity}
            onChange={(event) =>
              setForm({ ...form, capacity: Number(event.target.value) })
            }
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
        </label>
      </div>

      {message ? (
        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-600">
          {message}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#102968] px-5 text-xs font-black text-white disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CalendarPlus className="h-4 w-4" />
          )}
          Schedule Class
        </button>

        {createdId ? (
          <button
            type="button"
            onClick={() =>
              router.push(`/teacher/live-classes/studio/${createdId}`)
            }
            className="rounded-xl bg-red-500 px-5 py-2.5 text-xs font-black text-white"
          >
            Open Teacher Studio
          </button>
        ) : null}
      </div>
    </form>
  );
}
