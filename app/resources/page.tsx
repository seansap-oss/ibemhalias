import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { CategoryCard } from "@/components/portal/page-components";
import { CoursesSection } from "@/components/landing/courses-section";

export default function ResourcesPage() {
  return (
    <PortalPageShell
      eyebrow="A2"
      title="FREE RESOURCES"
      description="Choose the required exam category."
    >
      <CoursesSection />
      <div className="grid gap-5 lg:grid-cols-[1fr_1.618fr]">
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
      </div>
    </PortalPageShell>
  );
}
