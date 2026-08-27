"use client";
import { useSearchParams } from "next/navigation";

export function StudentTestLoginHint() {
  const params = useSearchParams();
  if (params.get("test") !== "1") return null;

  return (
    <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-semibold leading-relaxed text-blue-900">
      <div className="font-black">Temporary testing account</div>
      <div className="mt-1">Email: studenttest@ibemhal.ias</div>
      <div>Password: Student@1357</div>
      <div className="mt-1 text-blue-700">
        Separate student-only account. Admin credentials are not used here.
      </div>
    </div>
  );
}
