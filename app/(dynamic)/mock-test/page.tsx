import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { ProtectedAccess } from "@/components/portal/page-components";

export default function Page() {
  return (
    <PortalPageShell eyebrow="A7" title="Free MOCK Test">
      <ProtectedAccess
        title="registration/login required"
        description="Free MOCK Test access is available to registered students after login."
      />
    </PortalPageShell>
  );
}
