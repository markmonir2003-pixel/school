# St. George School Digital Campus
## الحرم الرقمي لمدرسة سان جورج

Official digital school management and learning platform for **St. George School** (مدرسة سان جورج). Built with Next.js 16, React 19, TypeScript, and a high-performance transactional SQLite database engine with WAL journaling, scrypt password hashing, role-based access control, and complete bilingual Arabic (RTL) and English (LTR) support.

---

## 1. Project Overview

St. George School Digital Campus provides a unified, secure academic environment connecting school administrators, principals, teachers, students, parents, librarians, accountants, and staff members.

The platform is **100% database-driven**:
- **Zero fake/demo data**: The application begins with a clean, empty database.
- **Persistent storage**: All users, records, attendance logs, marks, assignments, and audit events are stored in SQLite (`data/school.db`) when running on a host with a persistent writable disk.
- **Real authentication**: Passwords are hashed with `scrypt` using cryptographic salts. Sessions are stored in a database `sessions` table and verified on every server request.
- **Admin Setup Wizard**: On first run, the system prompts the school administrator to configure school identity, academic years, curriculum, and the first Super Administrator account. Once setup completes, the wizard is locked permanently.
- **Public CMS**: Includes a public portal for St. George School (Admissions, Academics, Student Life, News & Events, Digital Library catalog, Contact) manageable directly from the admin dashboard.

---

## 2. Technology Stack

- **Framework**: Next.js 16.4 (App Router & Turbopack)
- **Frontend**: React 19, TypeScript 5.7, TailwindCSS v4, Lucide React Icons
- **Visualizations**: Recharts
- **Database Engine**: Transactional SQLite (`node:sqlite` DatabaseSync) with WAL journal mode, busy timeouts, and atomic transactions
- **Authentication**: `scrypt` salted password hashing (`node:crypto`), httpOnly secure session cookies, rate-limiting protection
- **Internationalization**: Complete Arabic RTL and English LTR typography with Cairo and Inter Google Fonts
- **Theme**: Deep Navy (`#0a1628` / `#0f1f3d`), St. George Gold (`#c5a059` / `#d4af37`), and clean academic neutrals

---

## 3. Local Installation

### Prerequisites
- Node.js 22.5 or higher (required by the built-in `node:sqlite` module)
- npm 10 or newer

### Quick Start

```bash
# 1. Clone repository
git clone <repository-url>
cd smart-school-360-development

# 2. Install dependencies
npm install

# 3. Copy environment configuration
cp .env.example .env.local

# 4. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Initial Setup Process (Admin Setup Wizard)

Because St. George School starts with a clean database and zero demo accounts, the application launches the **Setup Wizard** on first run:

1. **Step 1: School Identity**:
   - Verify English Name: `St. George School`
   - Verify Arabic Name: `مدرسة سان جورج`
   - Platform Names in AR & EN
   - Official contact email, telephone, campus address, and school motto
2. **Step 2: Academic Setup**:
   - Academic Year start and end dates (e.g. `2026-09-01` to `2027-06-30`)
   - Pre-initialize standard core subjects (Arabic, English, Mathematics, Science, Social Studies, ICT, Religion, Arts)
   - Pre-initialize empty class sections ready for student enrollment
3. **Step 3: Super Administrator Account**:
   - Super Admin Name in English & Arabic
   - Secure Administrator Email (e.g. `admin@stgeorgeschool.edu`)
   - Secure Password (minimum 8 characters, hashed with scrypt)
4. **Step 4: Regional Preferences**:
   - Default language (Arabic RTL or English LTR)
   - Timezone (default `Africa/Cairo`)
   - Currency (default `EGP`)

Clicking **"Confirm & Launch Platform"** creates the SQLite database, hashes credentials, creates the session, logs in the administrator, and permanently locks `/api/setup`.

---

## 5. User Roles & Permission Management

The platform implements 9 database-backed user roles with strict server-side and client-side access control:

| # | Role Key | Role Title (AR) | Role Title (EN) | Primary Responsibilities |
|---|---|---|---|---|
| 1 | `super_admin` | المدير العام | Super Administrator | Full system configuration, security, audit logs, user management |
| 2 | `school_admin` | مدير المدرسة | School Administrator | Operational management, teachers, students, academic years, CMS |
| 3 | `principal` | الناظر / المدير الأكاديمي | Principal / Academic Director | School performance oversight, curriculum quality, attendance analytics |
| 4 | `teacher` | معلم | Teacher | Assigned classes, courses, assignments, online exams, grading, attendance |
| 5 | `student` | طالب | Student | Assigned courses, lesson downloads, assignment submissions, exams, grades |
| 6 | `parent` | ولي أمر | Parent / Guardian | Linked children's academic progress, attendance records, exam results |
| 7 | `librarian` | أمين المكتبة | Librarian | Digital library catalog, physical book tracking, resource classification |
| 8 | `accountant` | المسؤول المالي | Accountant | Financial reporting, student enrollments, attendance summaries |
| 9 | `staff` | عضو الكادر الإداري | Staff Member | General campus operations, activity organization, event coordination |

---

## 6. Real Modules & Workflows

### 1. Public Website & CMS
- Public Home, About, Admissions Guide, Academic Programs, Student Life, News & Events, Library Search, and Contact.
- Dynamic CMS managed directly by administrators in **Settings -> CMS Management**.

### 2. Student Management (`#students`)
- Enrolling students with unique student IDs (`SG-YYYY-####`).
- Linking students with parents/guardians.
- Class transfers, status updates (`active`, `inactive`, `suspended`, `graduated`).
- Excel and CSV bulk import/export.

### 3. Classes & Subjects (`#classes`)
- Class sections, room assignments, capacity bars, homeroom teacher allocation.
- Academic subjects, curriculum codes, weekly hours.

### 4. Attendance System (`#attendance`)
- Daily morning and session attendance rosters.
- Four-state check-in: `Present`, `Absent`, `Late`, `Excused`.
- Real-time attendance rate calculation.
- 30-day attendance trend and monthly heatmap.

### 5. Exams & Grade Entry (`#exams`)
- Scheduling exams across grade levels and subjects.
- Grade entry table with live average, min, max, and pass rate calculations.
- Recharts grade distribution analytics (A, B, C, D, F).

### 6. Courses & Digital Learning
- Courses organized by grade level and subject.
- Lessons with video links, PDFs, and learning attachments.
- Homework assignments, deadline tracking, student file uploads, and teacher feedback.

### 7. AI Intelligence & Early Warning Center (`#ai-center`)
- Rule-based, explainable risk detection: identifies chronic absenteeism, grade declines, and missing assignments.
- Actionable recommendations subject to human administrative review.

### 8. Audit Logs (`#users` / System)
- Every administrative action (login, student creation, attendance change, grade entry, user status toggle, settings update) is stored in the database with actor, timestamp, and entity details.

---

## 7. Production Deployment & Security Recommendations

1. **Hosting requirement — read before deploying**: This app currently stores data in a local SQLite file. Deploy it only to a single Node.js server with a persistent writable disk. Vercel serverless functions do not provide the shared persistent filesystem this database requires, so setup, registration, and login will fail or lose data there. A durable shared database (for example, PostgreSQL) and an application database adapter are required before using Vercel in production; setting `SCHOOL_DB_PATH` to `/tmp` is not a durable fix.
2. **Environment Variables**:
   - Ensure `NODE_ENV=production`.
   - Set a strong `SESSION_SECRET` (at least 32 characters).
   - Point `SCHOOL_DB_PATH` to a persistent volume (e.g. `/var/data/school.db`).

3. **File Permissions**:
   - Protect the SQLite database file permissions (`chmod 600 /var/data/school.db`).
   - Run the application under an unprivileged system user.

4. **Backup Strategy**:
   - SQLite supports atomic online backups using SQLite's backup API or copying the database while taking a short write lock:
     ```bash
     sqlite3 data/school.db ".backup 'backups/school-backup-$(date +%Y%m%d).db'"
     ```
   - Schedule daily automated snapshots.

---

## 8. Development & Testing Policy

- **No test data in production**: The application never automatically creates mock records in production.
- If offline mock data is needed for sandbox UI experimentation, `lib/school/seed.ts` is provided as an offline utility clearly marked `DEVELOPMENT-ONLY`. It is never executed in production.
- To reset the local development database to a clean unconfigured state:
  ```powershell
  Remove-Item "data/school.db" -ErrorAction Ignore
  ```
  Refreshing the browser will automatically present the clean Setup Wizard.

---

## 9. St. George School Customization

- **Branding**: Change school names, logo, vision, mission, motto, and contact details anytime from **Settings -> School Profile**.
- **Languages**: The entire platform supports instant bilingual switching between Arabic and English across all forms, tables, error messages, and empty states.
- **Colors**: Deep navy (`#0a1628` / `#0f1f3d`) and St. George Gold (`#c5a059` / `#d4af37`) can be adjusted in `app/globals.css`.

---

© 2026 St. George School. All Rights Reserved.
الحرم الرقمي لمدرسة سان جورج — صرح تعليمي يبني الفكر ويغرس القيم النبيلة.
