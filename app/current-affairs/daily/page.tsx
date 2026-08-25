import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { CategoryCard } from "@/components/portal/page-components";

export default function DailyCurrentAffairsPage() {
  return (
    <PortalPageShell
      eyebrow="A3"
      title="DAILY Current Affairs"
      description="Choose Civil Service or SSC & Banking."
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_1.618fr]">
        <CategoryCard
          href="/current-affairs/daily/civil-service"
          title="CIVIL SERVICE"
          description="Editorial Analysis, News Analysis and Others."
        />
        <CategoryCard
          href="/current-affairs/daily/ssc-banking"
          title="SSC & BANKING"
          description="Daily CA, Daily General Studies and Others."
        />
      </div>
    </PortalPageShell>
  );
}
