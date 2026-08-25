import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { EmptyLibrary } from "@/components/portal/page-components";

export default function Page() {
  return (
    <PortalPageShell eyebrow="A4 · Civil Service" title="Oct">
      <EmptyLibrary title="Oct archive" description="Month-wise current affairs files will appear here." />
    </PortalPageShell>
  );
}
