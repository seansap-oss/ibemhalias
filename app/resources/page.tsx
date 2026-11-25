import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { CategoryCard } from "@/components/portal/page-components";

export default function ResourcesPage() {
  return (
    <PortalPageShell
      eyebrow="A2"
      title="FREE RESOURCES"
      description="Choose the required exam category."
    >
      <div className="grid gap-5 lg:grid-cols-3">
        <CategoryCard
          href="/resources/civil-service"
          eyebrow="Civil Service"
          title="CIVIL SERVICE"
          description="NCERT FREE BOOKS, Prelims - PYQs + Solutions, Mains - PYQs + Solutions and Others."
        />
        <CategoryCard
          href="/resources/ssc-banking"
          eyebrow="SSC & Banking"
          title="SSC & BANKING"
          description="PYQs and Others."
        />
        <CategoryCard
          href="/resources/archive"
          eyebrow="2016 – 2026"
          title="10-YEAR DIGITAL ARCHIVE"
          description="Free monthly PDFs, magazines, and notes archived by year & month since 2016."
        />
      </div>
    </PortalPageShell>
  );
}
