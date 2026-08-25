import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { ProtectedAccess } from "@/components/portal/page-components";

export default function Page() {
  return (
    <PortalPageShell eyebrow="A6" title="Student Space">
      <ProtectedAccess
        title="registration/login required"
        description="Student Space is available to registered students after login."
      />
    </PortalPageShell>
  );
}
