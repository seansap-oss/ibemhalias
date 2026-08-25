import {
  Building2,
  CalendarDays,
  FileQuestion,
  Home,
  LibraryBig,
  Newspaper,
  Sparkles,
  UserRound,
} from "lucide-react";

export const portalNavItems = [
  { href: "/about", label: "About Us", icon: Home },
  { href: "/resources", label: "Free Resources", icon: LibraryBig },
  { href: "/current-affairs/daily", label: "Daily Current Affairs", icon: Newspaper },
  { href: "/current-affairs/monthly", label: "Monthly Current Affairs", icon: CalendarDays },
  { href: "/mentorship", label: "Mentorship / Counselling / Slot Booking", icon: Sparkles },
  { href: "/student-space", label: "Student Space", icon: UserRound },
  { href: "/mock-test", label: "Free Mock Test", icon: FileQuestion },
];

export const branchLocations = [
  { name: "Keishampat", mapQuery: "Keishampat, Imphal, Manipur" },
  { name: "Chingmeirong", mapQuery: "Chingmeirong, Imphal, Manipur" },
  { name: "Thangmeiband", mapQuery: "Thangmeiband, Imphal, Manipur" },
];
