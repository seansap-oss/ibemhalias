import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  // The old /profile page was a disconnected demo/gamification screen.
  // The real profile lives inside the authenticated Student Portal.
  redirect("/dashboard?view=profile");
}
