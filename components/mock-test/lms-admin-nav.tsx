"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList, FileQuestion, LayoutDashboard, PlusCircle, Trophy } from "lucide-react";

const items = [
  { href: "/admin/mock-test", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/mock-test/tests", label: "All Tests", icon: ClipboardList },
  { href: "/admin/mock-test/tests/new", label: "Create Test", icon: PlusCircle },
  { href: "/admin/mock-test/questions", label: "Question Bank", icon: FileQuestion },
  { href: "/admin/mock-test/results", label: "Results", icon: Trophy },
  { href: "/admin/mock-test/reports", label: "Reports", icon: BarChart3 },
];

export function LmsAdminMockNav() {
  const pathname = usePathname();
  const best = items
    .filter(item => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a,b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className="lms-mock-tabs" aria-label="Mock Test admin navigation">
      {items.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className={best === href ? "active" : ""}>
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
