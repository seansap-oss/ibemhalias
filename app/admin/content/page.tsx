import { CmsContentManager } from "@/components/admin/cms-content-manager";

export default function AdminContentPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-5">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">
            IBEMHAL IAS Admin
          </div>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Website Content Manager
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
            Upload and publish files, images, audio, video, PDFs, Word/Excel documents
            and YouTube embeds to the exact client-approved website sections.
          </p>
        </div>

        <CmsContentManager />
      </div>
    </div>
  );
}
