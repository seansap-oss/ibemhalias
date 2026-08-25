import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { DateRow } from "@/components/portal/page-components";

const dates = ["26 August", "25 August"];

export default function Page() {
  return (
    <PortalPageShell eyebrow="A3" title="Daily CA">
      <div className="space-y-3">
        {dates.map((date) => (
          <DateRow key={date} date={date} href="#" />
        ))}
      </div>
    </PortalPageShell>
  );
}
