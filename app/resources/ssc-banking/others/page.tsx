import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { EmptyLibrary } from "@/components/portal/page-components";

export default function Page() {
  return (
    <PortalPageShell eyebrow="A2 · SSC & BANKING" title="Others">
      <EmptyLibrary />
    </PortalPageShell>
  );
}
