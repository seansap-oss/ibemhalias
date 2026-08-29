import Link from "next/link";
import { Radio } from "lucide-react";
import { loadTeacherDashboard } from "@/lib/teacher/server";

export const dynamic = "force-dynamic";

export default async function TeacherLiveClassesPage() {
  const data = await loadTeacherDashboard();

  return (
    <div>
      <h1 className="text-2xl font-black">My Classes</h1>
      <p className="mt-2 text-sm text-slate-500">
        Live Now classes assigned to your teacher account.
      </p>

      <div className="mt-6 space-y-3">
        {data.classes.map((item: any) => (
          <div
            key={item.id}
            className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center"
          >
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-600">
              <Radio className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-black">{item.title}</div>
              <div className="mt-1 text-xs text-slate-500">
                {item.topic} · {new Date(item.starts_at).toLocaleString()}
              </div>
            </div>
            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase text-slate-600">
              {item.status}
            </span>
            <Link
              href={`/teacher/live-classes/studio/${item.id}`}
              className="rounded-xl bg-[#102968] px-4 py-2.5 text-center text-xs font-black text-white"
            >
              Open Teacher Studio
            </Link>
          </div>
        ))}

        {!data.classes.length ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            No classes are assigned yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}
