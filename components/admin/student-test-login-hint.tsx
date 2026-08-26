"use client";
import { useSearchParams } from "next/navigation";
export function StudentTestLoginHint(){const params=useSearchParams();if(params.get("test")!=="1")return null;return <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-semibold leading-relaxed text-blue-900"><div className="font-black">Temporary testing account</div><div className="mt-1">Email: admin@ibemhal.ias</div><div>Password: admin@123</div><div className="mt-1 text-blue-700">Student role only. Admin permissions remain separate.</div></div>;}
