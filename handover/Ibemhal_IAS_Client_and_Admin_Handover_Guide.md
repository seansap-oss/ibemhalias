# Ibemhal IAS — Client, Director & Admin Operations Handover Guide

> **Audience:** Institute Director, Admin Staff, Faculty, and Operations Team.  
> *(Note: This document is formatted for daily institute operations and staff training.)*

---

## 1. Quick Access & Login Legend (Client Team)

| Role | Where to Sign In | Website URL | Notes |
| :--- | :--- | :--- | :--- |
| **Director** | Click **Portal Login** (`/login`) | `https://ibemhal-ias-lms-preview.vercel.app/login` | Uses Director email & password (e.g. `director@ibemhalias.com` / `director@IAS123`) |
| **Admin Staff** (`Admin 1..10`) | Click **Portal Login** (`/login`) | `https://ibemhal-ias-lms-preview.vercel.app/login` | Created & managed by Director inside `/director/dashboard` |
| **Teacher / Faculty** | Click **Portal Login** (`/login`) | `https://ibemhal-ias-lms-preview.vercel.app/login` | Created under **Admin → Teachers** (`/admin/teachers`) |
| **Student** | Click **Portal Login** (`/login`) | `https://ibemhal-ias-lms-preview.vercel.app/login` | Auto-created on UPI Verify or Offline Auto-Enroll (or self sign-up) |
| **Online Exam Portal** | Click **Exam Portal ↗** inside LMS | `https://ibemhaliasexamportal-3p41.vercel.app` | Automatically logs you in via Single Sign-On (SSO) from LMS |

---

## 2. How the Two Websites Work Together

1. **Main LMS, Website & Business ERP (`ibemhal-ias-lms`):**
   - Handles the **public website**, **Hero gallery**, **Discount popup**, **Hall of Fame**, **10-Year Free PDF Archive**, **Course Catalogue & UPI QR Checkout**, **Kindle-style PDF Reader**, **Student/Teacher/Admin/Director portals**, and the **Unified Offline + Online ERP**.
2. **Dedicated AI Exam Portal (`ibemhaliasexamportal`):**
   - Separate high-speed CBT exam server so large timed mock tests and UPSC Mains essay exams never slow down the main website.
   - Connected seamlessly via **Exam Portal ↗** in the Navbar, Mock Tests page, Student Dashboard, and Admin Dashboard.

---

## 3. Director Guide (`/director/dashboard`)

When you sign in at `/login` using `director@ibemhalias.com` (`director@IAS123`), you land directly on the **Director Dashboard**:

### A. Creating & Managing Admin Accounts (Admin 1..Admin 10)
1. Scroll to **Admin Accounts (Create & Manage Staff Admins)** on `/director/dashboard`.
2. Enter the staff member's **Name** (e.g. `Admin 1`), **Email** (e.g. `admin1@ibemhalias.com`), and **Password** (minimum 8 characters) → click **Create Admin**.
3. You can **Reset Password**, **Pause** (immediately blocks their access), **Resume**, or **Delete** any Admin anytime.

### B. Monitoring Staff Logins, Active Time & Work
1. Click the **Admins** tab under **Activity by account**:
   - **Per-Admin Daily Scorecard (Today):** Shows each Admin's **Logins Today**, **Total Active Time (min)**, **Live Status** (`Online Now` vs `Idle / Signed Out`), **First Sign-In**, and **Last Active** time.
   - **Admin Work Audit Log:** Shows **what each Admin did** (published CMS content, edited courses, verified/rejected UPI payments, recorded offline cash admissions) with timestamps.
2. **Idle Auto-Sign-Out Settings:**
   - Under **Idle sign-out settings**, set **Admin idle minutes** and **Teacher idle minutes** (`5` to `120` minutes, default `10`) and click **Save settings**.
   - As long as an Admin is clicking/typing, they stay signed in. Once idle for the configured minutes, a **30-second countdown** appears and automatically signs them out.

### C. Unified Offline + Online ERP, Expenses & GST (`/director/dashboard` → `ERP, Expenses & Tax` tab)
1. **KPI Cards & Charts:** View **Total Combined Income**, **Online UPI** (Green), **Offline Cash / Desk** (Blue), **Expenses & Fees** (Rose), **AI Next-Month Forecast** (Violet), **Weekly/Monthly Bar + Forecast Chart**, and **Revenue & Expense Donut Chart**.
2. **Record Offline / Cash Payment & Auto-Enroll:** Enter Student Name, Email, Phone, select the Course, pick **Cash / Bank / Card**, enter Amount (₹), keep **Auto-Enroll Student Immediately** checked, and click **Save Offline Payment & Enroll**.
3. **Log Business Expenses & GST %:** Add rent, salaries, printing, marketing, or server expenses, and adjust the GST % rate.
4. **ERP Fee Invoices:** View platform/gateway maintenance invoices (2% incl. GST) and submit payment reference numbers.
5. **Email & WhatsApp Payment Templates:** Customize the **Pending Payment** and **Verified & Course Assigned** confirmation templates.

---

## 4. Admin Staff Training Guide (Step-by-Step)

### Task 1: Set Company UPI ID & Upload Your QR Code Photo (Do First!)
1. Go to **Finance & Fees** (`/admin/finance`).
2. Scroll to **Institute UPI ID & Checkout QR Code Settings**.
3. Enter **Institute Name** (`Ibemhal IAS`), **Company UPI ID** (e.g. `ibemhalias@sbi`), **Verification Warning Note** (`Make sure you are sending payment to the right QR code for Ibemhal IAS`), and upload your **QR Code Photo** (GPay / PhonePe / Bank QR image).
4. Click **Save UPI & QR Settings**. It immediately goes live on `/courses` checkout.

### Task 2: How to Create a Course & Upload Study Materials
1. Go to **Courses** → **Create Course** (`/admin/courses/new`) or edit an existing course in the **Course Builder**.
2. Fill in:
   - **Title** (e.g., *UPSC Foundation 2026*), **Course Code / Slug**, **Exam Family** (`UPSC / National`, `Banking`, `SSC / State`), **Exam Name**, **Stage** (`Prelims`, `Mains`, `Foundation`).
   - **Language**, **Mode** (`Online / Classroom`), **Price (₹)** and optional **Discounted Price (₹)**.
   - **Curriculum Modules & Materials:** Add Modules (e.g., *Module 1: Indian Polity*), then upload **PDFs**, **MP4 Videos**, or **YouTube / Google Drive links**.
   - **Access Level:**
     - Choose **Premium** for paid courses (blocks Download/External Open, enforces 10-minute expiring signed URLs, and overlays the logged-in student's Dynamic Watermark across every PDF page & video fullscreen).
     - Choose **Free** for free sample notes.
3. Toggle **Published** so the course appears publicly on `/courses`.

### Task 3: Edit Landing Page, Hero Carousel, Discount Popup & 10-Year Archive (`/admin/content`)
Open **Content** (`/admin/content` — *Landing Page & Content Studio*):
1. **Tab 1 — Hero Photos & Videos:** Upload multiple banner photos, paste MP4/CDN video URLs, or paste YouTube embed links; reorder or delete slides anytime.
2. **Tab 2 — Homepage Popup:** Turn the entry promotional/discount popup ON or OFF, edit heading/message/offer code/CTA button link.
3. **Tab 3 — 10-Year PDF Archive (2016–2026):** Select Year (`2016`–`2026`), Month, Category, enter Title, upload PDF → automatically archived under **Free Resources → PDF Archive** (`/resources/archive`).
4. **Tab 4 — Course & Resource Files:** Upload PDFs/videos directly into specific website sections.

### Task 4: Verify Online UPI Payments & Enroll Students (`/admin/finance/payments`)
1. When a student buys a course on `/courses`, they pay via your QR/UPI, fill in **Name, Email, WhatsApp Phone, and UPI Transaction Reference**, and receive a pending confirmation message.
2. Open **Finance & Fees → Review UPI payments** (`/admin/finance/payments`).
3. Check the UPI reference in your bank/GPay app, then click **Verify & Enroll**.
4. The system **automatically**:
   - Marks the order **Paid** and generates a printable Receipt.
   - **Creates a Student account** (with a temporary password displayed on screen if new) and **enrolls them in the purchased course(s)**.
   - Sends the confirmation email (when Resend email key is active) and gives you a **1-Click "Send WhatsApp Confirmation"** button pre-filled with their login details.

### Task 5: Create AI MCQ Tests & Essay Exams (`Exam Portal ↗`)
1. From Admin Dashboard, click **Exam Portal ↗** (`/api/exam-portal/sso?next=/admin`).
2. **Create MCQ Test with AI:** Paste any story, textbook passage, or current affairs text into **AI Exam Maker** → choose **Question Count (`5–20`)** and **Difficulty** → click **Generate MCQs with AI**.
3. **Add Essay / UPSC Mains Questions:** Click **Add Essay / Mains Question**, enter the prompt, **Max Marks** (e.g. `10` or `20`), and optional **AI Grading Rubric** (key points).
4. Click **Publish Exam**. When students submit essays, AI evaluates them automatically against your rubric and shows Strengths, Missing Points, and Score on their Scorecard.

### Task 6: Live Classes & Zoom
- **Zoom Classes (`/admin/integrations/zoom`):** Connect your Zoom credentials to run classes inside the LMS with student **Raise Hand**, **Ask Faculty Q&A**, and **Attendance Tracking**.
- **Built-In Live Classes (`/admin/live-classes`):** Free built-in classroom studio (slides, whiteboard, Q&A) ready anytime as a zero-cost live option or backup.

---

## 5. Student Experience Summary (`/login` → `/dashboard`)
1. **Sign In:** Students sign in at **Portal Login** (`/login`) — enforced single-device lock prevents password sharing.
2. **Kindle-Style PDF Reader:** Continuous vertical scroll, **Day / Kindle Sepia / Night** themes, **Screen Dimmer (`30%–100%`)**, **Pinch-to-Zoom**, **Bookmarks**, and **Auto-Resume Last Page**.
3. **Security & Anti-Piracy:** Dynamic diagonal watermark displaying the student's **Name · Email · Student Code** on every PDF page and video fullscreen.
4. **Online Exams:** Clicking **Exam Portal ↗** signs the student straight into their timed CBT & AI-graded Essay tests with anti-tab-switch protection.
