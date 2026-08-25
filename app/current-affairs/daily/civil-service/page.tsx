import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { CategoryCard } from "@/components/portal/page-components";

export default function Page() {
  return (
    <PortalPageShell eyebrow="A3 · CIVIL SERVICE" title="CIVIL SERVICE">
      <div className="grid gap-4 md:grid-cols-3">
        <CategoryCard href="/current-affairs/daily/civil-service/editorial-analysis" title="Editorial Analysis" />
        <CategoryCard href="/current-affairs/daily/civil-service/news-analysis" title="News Analysis" />
        <CategoryCard href="/current-affairs/daily/civil-service/others" title="Others" />
      </div>
    </PortalPageShell>
  );
}
