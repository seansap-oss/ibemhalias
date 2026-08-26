import { CommunityChat } from "@/components/chat/community-chat";

export default function Page() {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[.16em] text-[#174699]">
          COMMUNITY
        </div>
        <h1 className="mt-1 text-2xl font-black">
          Student Group Chat
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Moderate registered-user discussions,
          pin important posts and review the same
          WhatsApp-style community students see.
        </p>
      </div>
      <CommunityChat adminMode />
    </div>
  );
}
