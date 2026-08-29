import { FileText } from "lucide-react";
import { loadTeacherDashboard } from "@/lib/teacher/server";

export const dynamic = "force-dynamic";

export default async function TeacherMaterialsPage() {
  const data = await loadTeacherDashboard();
  const classMap = new Map(
    data.classes.map((item: any) => [String(item.id), item])
  );

  return (
    <div>
      <h1 className="text-2xl font-black">Study Material</h1>
      <p className="mt-2 text-sm text-slate-500">
        Resources attached to your assigned Live Now classes.
      </p>

      <div className="mt-6 space-y-3">
        {data.resources.map((resource: any) => {
          const liveClass: any = classMap.get(String(resource.live_class_id));
          return (
            <div
              key={resource.id}
              className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <FileText className="h-5 w-5 shrink-0 text-blue-600" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-black">{resource.title}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {liveClass?.title || "Live class"} · {resource.resource_type}
                </div>
              </div>
              {resource.external_url ? (
                <a
                  href={resource.external_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border px-3 py-2 text-xs font-black"
                >
                  Open
                </a>
              ) : (
                <span className="text-[10px] font-bold text-slate-400">
                  Secured file
                </span>
              )}
            </div>
          );
        })}

        {!data.resources.length ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            No resources are attached yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}
