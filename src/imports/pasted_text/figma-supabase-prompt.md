# PROMPT FOR FIGMA (Figma Make) — Connect "Antigravity Training Hub" to Supabase

You already have the full UI built for the **Antigravity Training Hub** — Dashboard, Training Master, Training Schedule, Employee Groups, Attendance, and Reports. Do not redesign or restyle any screen. Your job now is to make every screen **fully functional** by connecting it to a real **Supabase** backend (Postgres + Auth), replacing all static/mock data with live queries and real read/write operations.

---

## 1. Overall Goal

Wire the existing frontend to Supabase so that:
- All data shown on every screen is read live from Supabase tables.
- Every create/edit/update action shown in the UI actually writes to Supabase.
- Data flows correctly between modules — an action in one screen is reflected in the others exactly as the workflow implies (see Section 8).
- Login is real Supabase Auth, not a mock user.

Do not leave any screen displaying hardcoded/sample data once this is done. Sample/demo data should only exist as **seeded rows in Supabase**, not as frontend constants.

---

## 2. Supabase Project Setup

1. Create a new Supabase project (or connect to the existing one if already provisioned).
2. Enable **Supabase Auth** (email/password) for the HR/Admin login shown in the sidebar (currently "Priya Sharma · HR Admin").
3. Enable **Row Level Security (RLS)** on every table, with policies that only allow access to authenticated users (single HR/Admin role for now, but write policies so a `role` column can extend this later without a redesign).
4. Store the Supabase URL and anon key in environment variables — never hardcode them in the frontend.

---

## 3. Database Schema

Create the following tables in Supabase, matching exactly what the UI already displays:

### `employees`
- `id` (uuid, PK)
- `employee_code` (text, e.g. "EMP-001") — shown in Reports
- `name` (text)
- `department` (text)
- `status` (text, e.g. active/inactive)
- `created_at` (timestamptz)

### `employee_groups`
- `id` (uuid, PK)
- `name` (text — e.g. "All Employees", "Engineering Team", "Finance & Legal")
- `type` (text — one of `all`, `department`, `selected`) — matches the badges shown ("All Employees" / "Department" / "Selected Employees")
- `description` (text — e.g. "Every active employee in the organisation")
- `created_at` (timestamptz)

### `employee_group_members`
- `id` (uuid, PK)
- `group_id` (uuid, FK → employee_groups.id)
- `employee_id` (uuid, FK → employees.id)

This junction table resolves a group into its concrete member list (drives the "members" count shown on the Employee Groups screen, and the employee list shown when marking Attendance).

### `trainings` (Training Master)
- `id` (uuid, PK)
- `code` (text, e.g. "T1", "T2" — shown as ID column)
- `name` (text — e.g. "Cyber Security Awareness")
- `frequency` (text — "Quarterly", "Annual", "As Required")
- `description` (text)
- `status` (text — "Active" / "Inactive")
- `created_at` (timestamptz)

### `training_schedules` (Training Schedule)
- `id` (uuid, PK)
- `training_id` (uuid, FK → trainings.id)
- `group_id` (uuid, FK → employee_groups.id)
- `session_date` (date)
- `trainer` (text)
- `frequency` (text — copied/derived from the training at scheduling time)
- `status` (text — "Upcoming", "In Progress", "Completed", "Cancelled")
- `created_at` (timestamptz)

### `attendance_records`
- `id` (uuid, PK)
- `schedule_id` (uuid, FK → training_schedules.id)
- `employee_id` (uuid, FK → employees.id)
- `attendance` (text — "Present" / "Absent" / null until marked)
- `status` (text — "Completed" / "Pending" / "Overdue", derived from attendance + date)
- `marked_at` (timestamptz, nullable)

One row per employee per schedule, auto-generated when a schedule is created (based on the resolved group membership), then updated when HR marks attendance.

---

## 4. Screen-by-Screen Functional Requirements

### Dashboard
Replace every static number with a live Supabase query:
- **Active Trainings** = count of `trainings` where `status = 'Active'`.
- **Employees** = count of `employees`; "X groups" = count of `employee_groups`.
- **Upcoming Sessions** = count of `training_schedules` where `status = 'Upcoming'`.
- **Overdue** = count of `attendance_records` where `status = 'Overdue'`.
- **Completed / Pending / Overdue** summary cards = counts of `attendance_records` grouped by `status`.
- **Upcoming Sessions** list and **Recent Sessions** table = live queries against `training_schedules` joined with `trainings` and `employee_groups`, ordered by date.

### Training Master
- Table reads live from `trainings`.
- **"+ Add Training"** button opens a form (Training Name, Frequency, Description) that inserts a new row into `trainings` — no code change required to add a new training, matching the core business requirement.
- **Edit** opens the same form pre-filled and updates the row.
- Search box filters the live list client-side or via a Supabase `ilike` query.
- New trainings must immediately become selectable when scheduling (Training Schedule screen).

### Training Schedule
- Table reads live from `training_schedules` joined with `trainings` (for Training name/frequency) and `employee_groups` (for Group name).
- **"+ Schedule Training"** button opens a form: Training (dropdown from `trainings`), Group (dropdown from `employee_groups`), Date, Trainer. On submit:
  1. Insert the new `training_schedules` row.
  2. Resolve the selected group's members via `employee_group_members`.
  3. Bulk-insert one `attendance_records` row per resolved employee for this schedule, with `attendance = null` and `status = 'Pending'`.
- Status dropdown per row updates `training_schedules.status` in Supabase.
- Filter tabs (All / Upcoming / In Progress / Completed / Cancelled) filter by `status`.

### Employee Groups
- Cards read live from `employee_groups`, with member counts computed via a count query on `employee_group_members`.
- **"+ New Group"** button opens a form: Name, Type (All Employees / Department / Selected Employees), Description, and (for Department or Selected Employees) a member picker. On submit:
  1. Insert the `employee_groups` row.
  2. If type is "All Employees," insert all current `employees` into `employee_group_members`.
  3. If type is "Department," insert every employee matching the chosen department.
  4. If type is "Selected Employees," insert exactly the picked employees.
- Expanding a group (the chevron) shows its live member list from `employee_group_members` joined with `employees`.

### Attendance
- The "Select Training Session" dropdown reads live from `training_schedules` joined with `trainings` and `employee_groups`, showing Training · Group · Date · Status exactly as currently displayed.
- Selecting a session loads its `attendance_records` (joined with `employees`) — the full expected employee list for that session's group.
- HR marks each employee **Present** or **Absent**; on save, update that row's `attendance_records.attendance` and derive `status`:
  - Present → `Completed`
  - Absent → `Pending` (and later `Overdue` if the schedule date has passed and it's still unmarked/Absent — compute this via a scheduled function or a view, not scattered frontend logic).
- Once all employees in a session are marked, the parent `training_schedules.status` should auto-update to `Completed`.

### Reports
- The four summary cards (Completed / Pending / Overdue / Attendance Rate) are live aggregate queries over `attendance_records`.
- The table (By Session / By Training / By Employee tabs) reads from a joined view across `attendance_records`, `employees`, `training_schedules`, and `trainings` — showing Employee, Dept., Training, Date, Trainer, Attendance, Status exactly as currently displayed.
- Search and the All/Completed/Pending/Overdue filter chips query/filter the same live data.
- This screen must never show static numbers — every value must trace back to real rows.

---

## 5. Authentication

- Replace the sidebar user block ("Priya Sharma · HR Admin") with the real logged-in Supabase Auth user's name/role.
- Add a login screen (email + password) gating access to all module screens.
- Protect all data operations with Supabase RLS policies tied to the authenticated session — no table should be readable/writable by an unauthenticated request.
- Add a logout action.

---

## 6. Cross-Module Data Integrity

This is critical — the modules are one connected system, not five separate CRUD screens:

- A training created in **Training Master** must immediately be selectable in **Training Schedule**.
- A group created in **Employee Groups** must immediately be selectable in **Training Schedule**.
- Scheduling a training must immediately generate the correct per-employee rows visible in **Attendance**.
- Marking attendance must immediately update the numbers shown in **Reports** and the **Dashboard**.
- Editing a `training` definition must never corrupt historical `attendance_records` tied to past schedules (do not cascade-delete; use soft updates).

---

## 7. Error & Loading States

For every screen, implement using real Supabase call states:
- Loading indicator while a query is in flight.
- Empty state when a table/list legitimately has zero rows.
- Error state with a readable message if a Supabase call fails (never show a raw error object or stack trace).
- Success confirmation after a create/edit/save action.
- Disable submit buttons while a mutation is in progress to prevent duplicate inserts.

---

## 8. Seed Data

Seed Supabase with data matching what's already shown in the mockups, so the app looks identical to the current designs on first load:
- Trainings: Cyber Security Awareness, Fire Safety Procedures, ISO 9001 Quality Awareness, AI Tools & Productivity, Data Privacy & GDPR, Workplace Health & Safety, Leadership Essentials, Customer Service (Quarterly/Annual/As Required as shown).
- Employee Groups: All Employees (15), Engineering Team (Department, 3), Finance & Legal (Selected Employees, 4), Leadership Team (Selected Employees, 5), IT & Engineering (Selected Employees, 5).
- Employees: enough named employees (e.g., Sarah Chen, Michael Torres, Aisha Johnson, Priya Sharma, Nina Patel, etc.) across Engineering/HR/other departments to populate the Reports table as shown.
- Training Schedules and Attendance Records: enough historical and upcoming sessions to reproduce the 73 Completed / 0 Pending / 20 Overdue / 78% Attendance Rate numbers currently shown, plus the Upcoming/In Progress sessions visible on the Dashboard and Training Schedule screens.

Seed data should be inserted via a Supabase SQL seed script, not hardcoded into the frontend.

---

## 9. Acceptance Criteria

Before considering this complete, verify:
- Every number and row on every screen (Dashboard, Training Master, Training Schedule, Employee Groups, Attendance, Reports) comes from a live Supabase query — none are hardcoded.
- Adding a Training, a Group, or a Schedule through the UI persists to Supabase and is immediately visible everywhere it should be, with no code change required.
- Marking Attendance updates the employee's status and correctly propagates to Reports and Dashboard counts.
- Login is enforced via Supabase Auth; no data is accessible without authentication.
- Refreshing the browser preserves all data (nothing resets to mock state).
- The full workflow — Training → Select Group → Schedule → Attendance → Complete → Report — works end-to-end against real Supabase data.

Do not modify the visual design, layout, spacing, or component styling already built — this task is strictly about wiring the existing UI to a real, fully functional Supabase backend.