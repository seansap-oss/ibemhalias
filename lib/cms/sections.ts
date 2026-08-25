export type CmsSection = {
  path: string;
  label: string;
  group: string;
};

export const CMS_SECTIONS: CmsSection[] = [
  { path: "hero", label: "Hero / Swipeable Cards", group: "Home" },
  { path: "/about", label: "A1 · About Us", group: "A1" },

  { path: "/resources", label: "A2 · FREE RESOURCES", group: "A2" },
  { path: "/resources/civil-service", label: "A2 · CIVIL SERVICE", group: "A2" },
  { path: "/resources/civil-service/ncert-free-books", label: "NCERT FREE BOOKS", group: "A2" },
  { path: "/resources/civil-service/prelims-pyqs-solutions", label: "Prelims - PYQs + Solutions", group: "A2" },
  { path: "/resources/civil-service/mains-pyqs-solutions", label: "Mains - PYQs + Solutions", group: "A2" },
  { path: "/resources/civil-service/others", label: "Civil Service · Others", group: "A2" },
  { path: "/resources/ssc-banking", label: "A2 · SSC & BANKING", group: "A2" },
  { path: "/resources/ssc-banking/pyqs", label: "SSC & BANKING · PYQs", group: "A2" },
  { path: "/resources/ssc-banking/others", label: "SSC & BANKING · Others", group: "A2" },

  { path: "/current-affairs/daily", label: "A3 · DAILY Current Affairs", group: "A3" },
  { path: "/current-affairs/daily/civil-service", label: "A3 · CIVIL SERVICE", group: "A3" },
  { path: "/current-affairs/daily/civil-service/editorial-analysis", label: "Editorial Analysis", group: "A3" },
  { path: "/current-affairs/daily/civil-service/news-analysis", label: "News Analysis", group: "A3" },
  { path: "/current-affairs/daily/civil-service/others", label: "Civil Service · Others", group: "A3" },
  { path: "/current-affairs/daily/ssc-banking", label: "A3 · SSC BANKING", group: "A3" },
  { path: "/current-affairs/daily/ssc-banking/daily-ca", label: "Daily CA", group: "A3" },
  { path: "/current-affairs/daily/ssc-banking/daily-general-studies", label: "Daily General Studies", group: "A3" },
  { path: "/current-affairs/daily/ssc-banking/others", label: "SSC BANKING · Others", group: "A3" },

  { path: "/current-affairs/monthly", label: "A4 · MONTHLY Current Affairs", group: "A4" },
  { path: "/current-affairs/monthly/civil-service", label: "A4 · Civil Service", group: "A4" },
  { path: "/current-affairs/monthly/civil-service/august", label: "Civil Service · August", group: "A4" },
  { path: "/current-affairs/monthly/civil-service/sept", label: "Civil Service · Sept", group: "A4" },
  { path: "/current-affairs/monthly/civil-service/oct", label: "Civil Service · Oct", group: "A4" },
  { path: "/current-affairs/monthly/ssc-banking", label: "A4 · SSC BANKING", group: "A4" },
  { path: "/current-affairs/monthly/ssc-banking/august", label: "SSC BANKING · August", group: "A4" },
  { path: "/current-affairs/monthly/ssc-banking/sept", label: "SSC BANKING · Sept", group: "A4" },
  { path: "/current-affairs/monthly/ssc-banking/oct", label: "SSC BANKING · Oct", group: "A4" },

  { path: "/mentorship", label: "A5 · Mentorship / Counselling / Slot Booking", group: "A5" },
  { path: "/student-space", label: "A6 · Student Space", group: "A6" },
  { path: "/mock-test", label: "A7 · Free MOCK Test", group: "A7" },

  { path: "/courses", label: "COURSES", group: "Other" },
  { path: "/locations", label: "CONTACT DETAILS / Locations", group: "Other" },
];

export const CMS_SECTION_GROUPS = Array.from(
  new Set(CMS_SECTIONS.map((section) => section.group))
);
