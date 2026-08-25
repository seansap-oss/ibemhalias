"use client";

import { FloatingContactActions } from "./floating-contact-actions";
import { FloatingWhatsNew } from "./floating-whats-new";

export function PortalFloatingControls() {
  return (
    <>
      <FloatingWhatsNew />
      <FloatingContactActions />
    </>
  );
}
