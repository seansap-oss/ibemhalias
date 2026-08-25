import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { ResourceTile } from "@/components/portal/page-components";

export default function CivilServiceResourcesPage() {
  return (
    <PortalPageShell eyebrow="A2 · CIVIL SERVICE" title="CIVIL SERVICE">
      <div className="grid gap-4 sm:grid-cols-2">
        <ResourceTile href="/resources/civil-service/ncert-free-books" title="NCERT FREE BOOKS" />
        <ResourceTile href="/resources/civil-service/prelims-pyqs-solutions" title="Prelims - PYQs + Solutions" />
        <ResourceTile href="/resources/civil-service/mains-pyqs-solutions" title="Mains - PYQs + Solutions" />
        <ResourceTile href="/resources/civil-service/others" title="Others" />
      </div>
    </PortalPageShell>
  );
}
