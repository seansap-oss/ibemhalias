export type ExamCategory = string;

export type SpotlightRank = "rank_1" | "rank_2" | "rank_3" | "group_latest" | "none";

export interface AchieverItem {
  id: string;
  year: number;
  examCategory: ExamCategory;
  cardType?: "poster" | "topper";
  spotlightRank?: SpotlightRank;
  title: string;
  subtitle: string;
  rankBadge?: string;
  imageUrl: string;
  highlights: string[];
  story: string;
  isSeed?: boolean;
}

export const GALLERY_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020] as const;

export const DEFAULT_EXAMS: string[] = [
  "UPSC CSE",
  "SSC",
  "Banking",
  "State PSC",
  "IB ACIO",
  "CAPF / Defence",
  "Railways",
];

export const EXAM_CATEGORIES: string[] = ["All Exams", ...DEFAULT_EXAMS];

export const SEED_ACHIEVERS: AchieverItem[] = [
  {
    id: "seed-2026-ssc-cgl",
    year: 2026,
    examCategory: "SSC",
    title: "SSC CGL 2025-26 Successful Candidates",
    subtitle: "Office Superintendent, Excise Inspector, Junior Accountant, Auditor & Tax Assistant",
    rankBadge: "SSC CGL 2025-26",
    imageUrl: "/gallery/achiever-18.jpg",
    highlights: [
      "Johnson Wanglembam — Office Superintendent",
      "Paa Manah RL — Office Superintendent",
      "Salam Somorjit Singh — Excise Inspector",
      "N Priyakrishna Devi — Junior Accountant",
      "Pukhrambam Loveson — Statistical Investigator",
      "Nungshihring Anal, Sarankumar Yengkhom — Auditor",
      "Hmangte Cameon Kom, W Pravakar — Tax Assistant",
    ],
    story:
      "Consistent practice, weekly mock tests, and dedicated quantitative & reasoning mentorship helped our SSC CGL 2025-26 aspirants secure central government posts.",
    isSeed: true,
  },
  {
    id: "seed-2026-ssc-gd-1",
    year: 2026,
    examCategory: "SSC",
    title: "SSC Constable (GD) 2025-26 — Batch Selections (Part 1)",
    subtitle: "21+ Successful Candidates from Manipur & Northeast",
    rankBadge: "SSC GD 2025-26",
    imageUrl: "/gallery/achiever-19.jpg",
    highlights: [
      "Pouchungailiu Phaomei, Khaidem Pushparani Chanu, Laishram Nirupama Chanu",
      "Chanreichon Mungrei, Laishram Rameshori Devi, Laishram Barnath Singh",
      "Elizabeth Huten, Laishram Panthoi Chanu, Thounaojam Malhotra",
      "Yumkhaibam Momocha, Thanhor A.C, Ngangbam Nitish Khuman",
    ],
    story:
      "With structured daily classes and Sunday mock tests, our SSC Constable (GD) 2025-26 batch achieved remarkable selections across districts.",
    isSeed: true,
  },
  {
    id: "seed-2026-ssc-gd-2",
    year: 2026,
    examCategory: "SSC",
    title: "SSC Constable (GD) 2025-26 — Batch Selections (Part 2)",
    subtitle: "16+ Additional Successful Candidates",
    rankBadge: "SSC GD 2025-26",
    imageUrl: "/gallery/achiever-20.jpg",
    highlights: [
      "Maibam Michael, Wimadulungbou Newmai, K Lunggaithau",
      "Puyam Suraj Singh, Loitongbam Malemnganba, R D Reipao Pao",
      "Naresh Kshetrimayum, Poujaigai Golmei, Nongthombam Amarjit",
      "Solomon Yambem, Thangjam Rakesh Singh, Moirangthem Prabin Singh",
    ],
    story:
      "Empowering aspirants from every corner of Manipur with affordable, disciplined coaching and regular test evaluation.",
    isSeed: true,
  },
  {
    id: "seed-2026-banking",
    year: 2026,
    examCategory: "Banking",
    title: "SBI Junior Associates 2025-26 & IBPS Clerk 2026-27",
    subtitle: "Selections across SBI, Bank of India, Union Bank of India, Bank of Baroda & Indian Bank",
    rankBadge: "Banking 2025-26",
    imageUrl: "/gallery/achiever-08.jpg",
    highlights: [
      "Hijam Prameshwor, Netaraj Chongtham, Amar Hawaibam — SBI Clerk 2025-26",
      "Nandeibam Parlin Meitei — SBI Clerk 2025-26",
      "Salam Gunamani, Thuigongrei Kamei, Olivia Yumnam — IBPS Clerk 2025-26",
      "Khoisnam Amarjit, Sajida Begum — IBPS Clerk 2025-26",
    ],
    story:
      "Focused banking foundation batches covering Quantitative Aptitude, Reasoning, English, and Banking Awareness with regular speed tests.",
    isSeed: true,
  },
  {
    id: "seed-2025-upsc-cse",
    year: 2025,
    examCategory: "UPSC CSE",
    title: "UPSC Civil Services Exam (CSE) 2025 Toppers",
    subtitle: "All India Ranks 652, 800, 824 & 903 — Interview Guidance & Optional Programmes",
    rankBadge: "AIR 652 · 800 · 824 · 903",
    imageUrl: "/gallery/achiever-09.jpg",
    highlights: [
      "Wahengbam Renudhar — AIR 652 (Interview Guidance Programme 2025)",
      "Vapani John Tao — AIR 800 (Interview Guidance Programme 2023)",
      "Rahul Moirangthem — AIR 824 (GS Mains, Test Series & Interview Guidance)",
      "Ningthoujam Rishikant — AIR 903 (Manipuri Optional & Interview Guidance)",
    ],
    story:
      "Our UPSC CSE 2025 rank holders combined Manipuri Optional, GS Mains Test Series, and personalized Interview Guidance to achieve All India Ranks.",
    isSeed: true,
  },
  {
    id: "seed-2025-banking-ib",
    year: 2025,
    examCategory: "Banking",
    title: "Banking & IB ACIO-II/Exe Exam 2025 Achievers",
    subtitle: "Local Bank Officers (BOB), IBPS PO/MT, RRB Clerk & 4 IB ACIO-II/Exe Selections",
    rankBadge: "Banking & IB 2025",
    imageUrl: "/gallery/achiever-10.jpg",
    highlights: [
      "Amar Hawaibam — SBI JA, RRB Clerk, IBPS CSA (PNB)",
      "Stephen Mutum & Thingbaijam Chinglemba — Local Bank Officer (BOB)",
      "Malemnganbi Yumnam — IBPS PO/MT 2025-26 (BOB)",
      "4 Students selected as ACIO-II/Exe Exam 2025 in Intelligence Bureau, MHA",
    ],
    story:
      "Dedicated mentorship for both Banking PO/Clerk and Intelligence Bureau ACIO-II/Exe examinations.",
    isSeed: true,
  },
  {
    id: "seed-2022-mcscc-top",
    year: 2022,
    examCategory: "State PSC",
    title: "MCSCC 2022 — Top Ranks (Ranks 1 to 12)",
    subtitle: "62 out of 100 Posts · 7 out of Top 10 Ranks in Manipur Civil Services",
    rankBadge: "Rank 1, 4, 5, 6, 8, 9, 10, 11, 12",
    imageUrl: "/gallery/achiever-14.jpg",
    highlights: [
      "G Arvind Sharma — Rank 1 | MCS",
      "Irungbam Meken — Rank 4 | MCS, Khaidem Raju Singh — Rank 5 | MCS",
      "Pravaker Ningombam — Rank 6 | MCS, Deepa Maibam — Rank 8 | SDC",
      "G Gopalkrishna Sharma — Rank 9 | MCS, Rahul Moirangthem — Rank 10 | MCS",
    ],
    story:
      "A landmark achievement in MCSCC 2022 where Ibemhal IAS students secured 62 out of 100 posts and 7 out of the Top 10 ranks.",
    isSeed: true,
  },
  {
    id: "seed-2022-mcscc-2",
    year: 2022,
    examCategory: "State PSC",
    title: "MCSCC 2022 — Ranks 13 to 22 (MPS & MCS)",
    subtitle: "Successful Candidates in Manipur Police Service & Civil Service",
    rankBadge: "Ranks 13–22",
    imageUrl: "/gallery/achiever-12.jpg",
    highlights: [
      "N Niranjana Devi (Rank 13 MPS), N Rishikant Singh (Rank 14 MPS), Olivia Wangkhem (Rank 15 MCS)",
      "Shachikanta N (Rank 16 MPS), Aditya Arambam (Rank 17 MPS), N Mangal Singh (Rank 19 MPS)",
      "Luckyson N (Rank 20 MPS), Churchill Kh (Rank 21 MPS), RK Sunanda (Rank 22 MPS)",
    ],
    story: "Consistent GS Prelims, Mains, and Interview Guidance results in MCSCC 2022.",
    isSeed: true,
  },
  {
    id: "seed-2022-mcscc-3",
    year: 2022,
    examCategory: "State PSC",
    title: "MCSCC 2022 — Ranks 23 to 38 (MPS, MFS & SDC)",
    subtitle: "Successful Candidates across Manipur Police, Finance & SDC Services",
    rankBadge: "Ranks 23–38",
    imageUrl: "/gallery/achiever-13.jpg",
    highlights: [
      "Ph Purnima Devi (Rank 23 MPS), N Jhaljit Singh (Rank 25 MPS), N Athoibi Devi (Rank 27 MPS)",
      "Bishwarjit Mayengbam (Rank 28 MPS), S Sharmiza Annoly (Rank 31 MPS), Miranda Mongbijam (Rank 33 MFS)",
      "L Devraj Singh (Rank 35 MFS), Rajneesh Sharma H (Rank 37 MFS), Pooja Ayam (Rank 38 SDC)",
    ],
    story: "Comprehensive preparation and answer-writing mentorship for Manipur State Civil Services.",
    isSeed: true,
  },
  {
    id: "seed-2022-mcscc-4",
    year: 2022,
    examCategory: "State PSC",
    title: "MCSCC 2022 — Ranks 39 to 51 (SDC, MSS, MFS & MCS)",
    subtitle: "Successful Candidates across State Services",
    rankBadge: "Ranks 39–51",
    imageUrl: "/gallery/achiever-17.jpg",
    highlights: [
      "M Vikas Singh (Rank 39 SDC), P Rakeshchand Singh (Rank 41 MSS), T Happey Sharma (Rank 42 SDC)",
      "Keisham Chaoba (Rank 43 MFS), W Renudhar Singh (Rank 45 MFS), M Arnold Singh (Rank 46 SDC)",
      "Yurnganing Huileng (Rank 48 MCS), Sudeep Laishram (Rank 49 SDC), S Robertson Singh (Rank 51 SDC)",
    ],
    story: "Celebrating dedication and excellence across Manipur state civil services.",
    isSeed: true,
  },
  {
    id: "seed-2022-mcscc-5",
    year: 2022,
    examCategory: "State PSC",
    title: "MCSCC 2022 — Ranks 52 to 64 (SDC & MPS)",
    subtitle: "Successful Candidates in Sub-Deputy Collector & Police Services",
    rankBadge: "Ranks 52–64",
    imageUrl: "/gallery/achiever-15.jpg",
    highlights: [
      "Wangamba Asem (Rank 52 SDC), S Robinson Meitei (Rank 55 SDC), Md Aman Nawaz (Rank 56 MPS)",
      "Sydenny Thoudam (Rank 57 SDC), Khelena Bachaspati (Rank 58 SDC), RK Bubbly (Rank 60 SDC)",
      "Pretty Pamei (Rank 61 MPS), Yumnam Sanjuna Chanu (Rank 62 SDC), RK Robin Singh (Rank 64 SDC)",
    ],
    story: "Guiding aspirants from every district to serve with integrity.",
    isSeed: true,
  },
  {
    id: "seed-2022-mcscc-6",
    year: 2022,
    examCategory: "State PSC",
    title: "MCSCC 2022 — Ranks 65 to 76 (SDC, MSS & MPS)",
    subtitle: "Successful Candidates in State Civil & Secretariat Services",
    rankBadge: "Ranks 65–76",
    imageUrl: "/gallery/achiever-16.jpg",
    highlights: [
      "Maibam Shivadutta (Rank 65 SDC), Wahengbam Alex (Rank 67 SDC), M Ramesh Chandra (Rank 68 SDC)",
      "Mutum Arnica (Rank 69 MSS), Soniya Thongam (Rank 70 MSS), Kunjeshwor Kh (Rank 71 MSS)",
      "Singanrei Gonmei (Rank 72 MPS), Amom Rohen Singh (Rank 75 MSS), Kaongamliang Riamei (Rank 76 MPS)",
    ],
    story: "Imparting values for a better tomorrow through accessible, quality coaching.",
    isSeed: true,
  },
  {
    id: "seed-2022-mcscc-7",
    year: 2022,
    examCategory: "State PSC",
    title: "MCSCC 2022 — Ranks 83 to 194 (MSS, MPS, MFS & SDC)",
    subtitle: "Additional Successful Candidates in MCSCC 2022",
    rankBadge: "Ranks 83–194",
    imageUrl: "/gallery/achiever-11.jpg",
    highlights: [
      "A Surajkanta Meetei (Rank 83 MSS), Th Heoraj Anand (Rank 85 MSS), Machunluliu Newmei (Rank 90 MPS)",
      "Lucksha N Moyon (Rank 108 MFS), Kamei Abel (Rank 120 SDC), Adahrii Elosa (Rank 194 MSS)",
    ],
    story: "Your success stories will inspire many to follow in your footsteps.",
    isSeed: true,
  },
];
