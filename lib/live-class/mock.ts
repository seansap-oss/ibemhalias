export type LiveClassStatus = "scheduled" | "live" | "completed";

export type LiveClassSession = {
  id: string;
  title: string;
  topic: string;
  faculty: string;
  course: string;
  startsAt: string;
  status: LiveClassStatus;
  viewers?: number;
  resources?: number;
};

export const liveClassSessions: LiveClassSession[] = [
  {
    id: "polity-fundamental-rights",
    title: "Indian Polity",
    topic: "Fundamental Rights",
    faculty: "Amit Sir",
    course: "UPSC Foundation 2025",
    startsAt: "Today · 10:00 AM",
    status: "live",
    viewers: 128,
    resources: 3,
  },
  {
    id: "economics-national-income",
    title: "Economics",
    topic: "National Income",
    faculty: "Neha Ma'am",
    course: "UPSC Foundation 2025",
    startsAt: "Today · 12:00 PM",
    status: "scheduled",
    resources: 2,
  },
  {
    id: "history-modern-india",
    title: "History",
    topic: "Modern India",
    faculty: "Rahul Sir",
    course: "UPSC Foundation 2025",
    startsAt: "Tomorrow · 10:00 AM",
    status: "scheduled",
    resources: 1,
  },
  {
    id: "geography-indian-monsoon",
    title: "Geography",
    topic: "Indian Monsoon",
    faculty: "Vikram Sir",
    course: "UPSC Foundation 2025",
    startsAt: "Completed",
    status: "completed",
    resources: 4,
  },
];

export const liveClassResources = [
  { id: "r1", name: "Fundamental_Rights.pdf", kind: "PDF", pages: 48 },
  { id: "r2", name: "Class Notes", kind: "NOTES" },
  { id: "r3", name: "Lecture Slides", kind: "SLIDES" },
];

export const liveClassParticipants = [
  { id: "p1", name: "Amit Sir", role: "Host", muted: false, handRaised: false },
  { id: "p2", name: "Riya Sharma", role: "Viewer", muted: true, handRaised: true },
  { id: "p3", name: "Vikram Singh", role: "Viewer", muted: true, handRaised: false },
  { id: "p4", name: "Anjali Verma", role: "Viewer", muted: true, handRaised: false },
  { id: "p5", name: "Rahul P.", role: "Viewer", muted: true, handRaised: false },
];
