import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { DigitalArchiveClient } from "@/components/resources/digital-archive-client";

export default function DigitalArchivePage() {
  return (
    <PortalPageShell
      eyebrow="10-Year Free Archive (2016–2026)"
      title="Digital PDF Archive"
      description="Browse and download free monthly study PDFs, current affairs compilations, and notes from 2016 to 2026."
    >
      <DigitalArchiveClient />
    </PortalPageShell>
  );
}
