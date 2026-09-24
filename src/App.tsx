import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context";
import Sidebar from "./components/Sidebar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import TrainingMaster from "./pages/TrainingMaster";
import TrainingSchedule from "./pages/TrainingSchedule";
import EmployeeGroups from "./pages/EmployeeGroups";
import Attendance from "./pages/Attendance";
import Reports from "./pages/Reports";
import EmployeeList from "./pages/EmployeeList";
import EmployeeHistory from "./pages/EmployeeHistory";
import AttendanceFilters from "./pages/AttendanceFilters";
import type { Page } from "./types";
import { checkSetupDetails, type TableName, type SetupDetails } from "./lib/db";

const SETUP_SQL = `-- Trainova — one-time database setup (safe to re-run)
-- Paste this in: https://supabase.com/dashboard/project/raozwxavlpgvzjxkrjit/sql/new

CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code text UNIQUE NOT NULL,
  name text NOT NULL,
  email text,
  department text NOT NULL,
  role text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  frequency text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  created_by text DEFAULT 'HR Admin',
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'all',
  department text,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES employee_groups(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE(group_id, employee_id)
);

CREATE TABLE IF NOT EXISTS training_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL REFERENCES trainings(id),
  group_id uuid NOT NULL REFERENCES employee_groups(id),
  session_date date NOT NULL,
  trainer text NOT NULL,
  frequency text NOT NULL DEFAULT 'As Required',
  status text NOT NULL DEFAULT 'upcoming',
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES training_schedules(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id),
  attendance text NOT NULL DEFAULT 'not-marked',
  completion_status text NOT NULL DEFAULT 'pending',
  marked_at timestamptz,
  marked_by text,
  UNIQUE(schedule_id, employee_id)
);

-- Enable Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating (makes this script safe to re-run)
DROP POLICY IF EXISTS "etms_auth" ON employees;
DROP POLICY IF EXISTS "etms_auth" ON trainings;
DROP POLICY IF EXISTS "etms_auth" ON employee_groups;
DROP POLICY IF EXISTS "etms_auth" ON employee_group_members;
DROP POLICY IF EXISTS "etms_auth" ON training_schedules;
DROP POLICY IF EXISTS "etms_auth" ON attendance_records;

-- Allow authenticated users full access to all tables
CREATE POLICY "etms_auth" ON employees FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "etms_auth" ON trainings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "etms_auth" ON employee_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "etms_auth" ON employee_group_members FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "etms_auth" ON training_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "etms_auth" ON attendance_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed employees
INSERT INTO employees (id, employee_code, name, email, department, role) VALUES
  ('a0000000-0000-0000-0000-000000000001','EMP-001','Sarah Chen','s.chen@trainova.com','Engineering','Engineering Lead'),
  ('a0000000-0000-0000-0000-000000000002','EMP-002','Michael Torres','m.torres@trainova.com','Engineering','Software Engineer'),
  ('a0000000-0000-0000-0000-000000000003','EMP-003','Aisha Johnson','a.johnson@trainova.com','Engineering','Software Engineer'),
  ('a0000000-0000-0000-0000-000000000004','EMP-004','Priya Sharma','p.sharma@trainova.com','HR','HR Manager'),
  ('a0000000-0000-0000-0000-000000000005','EMP-005','Nina Patel','n.patel@trainova.com','HR','HR Coordinator'),
  ('a0000000-0000-0000-0000-000000000006','EMP-006','James Okafor','j.okafor@trainova.com','Finance','Financial Analyst'),
  ('a0000000-0000-0000-0000-000000000007','EMP-007','Tom Bradley','t.bradley@trainova.com','Finance','Accountant'),
  ('a0000000-0000-0000-0000-000000000008','EMP-008','Rachel Green','r.green@trainova.com','Finance','Financial Controller'),
  ('a0000000-0000-0000-0000-000000000009','EMP-009','Emma Wilson','e.wilson@trainova.com','Operations','Operations Manager'),
  ('a0000000-0000-0000-0000-000000000010','EMP-010','Carlos Rivera','c.rivera@trainova.com','Operations','Operations Analyst'),
  ('a0000000-0000-0000-0000-000000000011','EMP-011','David Kim','d.kim@trainova.com','Marketing','Marketing Director'),
  ('a0000000-0000-0000-0000-000000000012','EMP-012','Sophie Dubois','s.dubois@trainova.com','Marketing','Marketing Specialist'),
  ('a0000000-0000-0000-0000-000000000013','EMP-013','Kevin O''Brien','k.obrien@trainova.com','IT','IT Manager'),
  ('a0000000-0000-0000-0000-000000000014','EMP-014','Lisa Anderson','l.anderson@trainova.com','IT','IT Specialist'),
  ('a0000000-0000-0000-0000-000000000015','EMP-015','Robert Martinez','r.martinez@trainova.com','Legal','Legal Counsel')
ON CONFLICT (id) DO NOTHING;

-- Seed trainings
INSERT INTO trainings (id, code, name, frequency, description, status, created_by) VALUES
  ('b0000000-0000-0000-0000-000000000001','T1','Cyber Security Awareness','Quarterly','Covers phishing, password hygiene, social engineering, and secure remote-work practices.','active','Priya Sharma'),
  ('b0000000-0000-0000-0000-000000000002','T2','Fire Safety Procedures','Quarterly','Emergency evacuation, fire extinguisher use, and building safety protocols.','active','Priya Sharma'),
  ('b0000000-0000-0000-0000-000000000003','T3','ISO 9001 Quality Awareness','Quarterly','Quality management system principles, documentation standards, and continuous improvement.','active','Priya Sharma'),
  ('b0000000-0000-0000-0000-000000000004','T4','AI Tools & Productivity','As Required','Hands-on workshop covering LLM tools, AI-assisted workflows, and responsible usage guidelines.','active','Sarah Chen'),
  ('b0000000-0000-0000-0000-000000000005','T5','Data Privacy & GDPR','Annual','Personal data handling obligations, subject access requests, and breach reporting under GDPR.','active','Robert Martinez'),
  ('b0000000-0000-0000-0000-000000000006','T6','Workplace Health & Safety','Annual','Ergonomics, manual handling, incident reporting, and mental health awareness.','active','Priya Sharma'),
  ('b0000000-0000-0000-0000-000000000007','T7','Leadership Essentials','As Required','Performance conversations, delegation, conflict resolution, and inclusive leadership practices.','active','Priya Sharma'),
  ('b0000000-0000-0000-0000-000000000008','T8','Customer Service Excellence','Annual','Communication skills, handling escalations, SLA adherence, and customer satisfaction metrics.','active','David Kim')
ON CONFLICT (id) DO NOTHING;

-- Seed groups
INSERT INTO employee_groups (id, name, type, department, description) VALUES
  ('c0000000-0000-0000-0000-000000000001','All Employees','all',null,'Every active employee in the organisation'),
  ('c0000000-0000-0000-0000-000000000002','Engineering Team','department','Engineering','All Engineering department members'),
  ('c0000000-0000-0000-0000-000000000003','Finance & Legal','selected',null,'Finance analysts and legal counsel'),
  ('c0000000-0000-0000-0000-000000000004','Leadership Team','selected',null,'Department heads and senior managers'),
  ('c0000000-0000-0000-0000-000000000005','IT & Engineering','selected',null,'Combined IT and Engineering staff')
ON CONFLICT (id) DO NOTHING;

-- Seed group members
INSERT INTO employee_group_members (group_id, employee_id)
  SELECT 'c0000000-0000-0000-0000-000000000001', id FROM employees ON CONFLICT DO NOTHING;
INSERT INTO employee_group_members (group_id, employee_id)
  SELECT 'c0000000-0000-0000-0000-000000000002', id FROM employees WHERE department = 'Engineering' ON CONFLICT DO NOTHING;
INSERT INTO employee_group_members (group_id, employee_id) VALUES
  ('c0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000006'),
  ('c0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000007'),
  ('c0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000008'),
  ('c0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000015'),
  ('c0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000004'),
  ('c0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000009'),
  ('c0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000011'),
  ('c0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000013'),
  ('c0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000002'),
  ('c0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000013'),
  ('c0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000014')
ON CONFLICT DO NOTHING;

-- Seed schedules
INSERT INTO training_schedules (id, training_id, group_id, session_date, trainer, frequency, status) VALUES
  ('d0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','2026-01-15','Alex Foster','Quarterly','completed'),
  ('d0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001','2026-02-10','Mark Davies','Quarterly','completed'),
  ('d0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000001','2026-03-05','Jennifer Lee','Quarterly','completed'),
  ('d0000000-0000-0000-0000-000000000004','b0000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000002','2026-04-20','Sarah Chen','As Required','completed'),
  ('d0000000-0000-0000-0000-000000000005','b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','2026-06-15','Alex Foster','Quarterly','completed'),
  ('d0000000-0000-0000-0000-000000000006','b0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001','2026-06-10','Mark Davies','Quarterly','completed'),
  ('d0000000-0000-0000-0000-000000000007','b0000000-0000-0000-0000-000000000005','c0000000-0000-0000-0000-000000000001','2026-09-15','Robert Martinez','Annual','upcoming'),
  ('d0000000-0000-0000-0000-000000000008','b0000000-0000-0000-0000-000000000007','c0000000-0000-0000-0000-000000000004','2026-10-05','Priya Sharma','As Required','upcoming'),
  ('d0000000-0000-0000-0000-000000000009','b0000000-0000-0000-0000-000000000006','c0000000-0000-0000-0000-000000000001','2026-09-20','Emma Wilson','Annual','upcoming'),
  ('d0000000-0000-0000-0000-000000000010','b0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000001','2026-08-28','Jennifer Lee','Quarterly','in-progress')
ON CONFLICT (id) DO NOTHING;

-- Seed attendance records
INSERT INTO attendance_records (schedule_id, employee_id, attendance, completion_status, marked_at)
  SELECT 'd0000000-0000-0000-0000-000000000001', id, 'present', 'completed', '2026-01-15' FROM employees ON CONFLICT DO NOTHING;
INSERT INTO attendance_records (schedule_id, employee_id, attendance, completion_status, marked_at)
  SELECT 'd0000000-0000-0000-0000-000000000002', id,
    CASE WHEN employee_code IN ('EMP-006','EMP-012') THEN 'absent' ELSE 'present' END,
    CASE WHEN employee_code IN ('EMP-006','EMP-012') THEN 'overdue' ELSE 'completed' END,
    '2026-02-10' FROM employees ON CONFLICT DO NOTHING;
INSERT INTO attendance_records (schedule_id, employee_id, attendance, completion_status, marked_at)
  SELECT 'd0000000-0000-0000-0000-000000000003', id,
    CASE WHEN employee_code = 'EMP-010' THEN 'absent' ELSE 'present' END,
    CASE WHEN employee_code = 'EMP-010' THEN 'overdue' ELSE 'completed' END,
    '2026-03-05' FROM employees ON CONFLICT DO NOTHING;
INSERT INTO attendance_records (schedule_id, employee_id, attendance, completion_status, marked_at)
  SELECT 'd0000000-0000-0000-0000-000000000004', employee_id, 'present', 'completed', '2026-04-20'
  FROM employee_group_members WHERE group_id = 'c0000000-0000-0000-0000-000000000002' ON CONFLICT DO NOTHING;
INSERT INTO attendance_records (schedule_id, employee_id, attendance, completion_status, marked_at)
  SELECT 'd0000000-0000-0000-0000-000000000005', id,
    CASE WHEN employee_code IN ('EMP-007','EMP-011','EMP-015') THEN 'absent' ELSE 'present' END,
    CASE WHEN employee_code IN ('EMP-007','EMP-011','EMP-015') THEN 'overdue' ELSE 'completed' END,
    '2026-06-15' FROM employees ON CONFLICT DO NOTHING;
INSERT INTO attendance_records (schedule_id, employee_id, attendance, completion_status, marked_at)
  SELECT 'd0000000-0000-0000-0000-000000000006', id,
    CASE WHEN employee_code IN ('EMP-003','EMP-014') THEN 'absent' ELSE 'present' END,
    CASE WHEN employee_code IN ('EMP-003','EMP-014') THEN 'overdue' ELSE 'completed' END,
    '2026-06-10' FROM employees ON CONFLICT DO NOTHING;
INSERT INTO attendance_records (schedule_id, employee_id, attendance, completion_status, marked_at)
  SELECT 'd0000000-0000-0000-0000-000000000010', id,
    CASE WHEN employee_code IN ('EMP-001','EMP-004','EMP-009') THEN 'present' WHEN employee_code = 'EMP-003' THEN 'absent' ELSE 'not-marked' END,
    CASE WHEN employee_code IN ('EMP-001','EMP-004','EMP-009') THEN 'completed' ELSE 'overdue' END,
    CASE WHEN employee_code IN ('EMP-001','EMP-004','EMP-009','EMP-003') THEN '2026-08-28' ELSE null END
  FROM employees ON CONFLICT DO NOTHING;
`;

const TABLE_LABELS: Record<TableName, string> = {
  employees: "Employees",
  trainings: "Trainings",
  employee_groups: "Employee Groups",
  employee_group_members: "Group Members",
  training_schedules: "Training Schedules",
  attendance_records: "Attendance Records",
};

const SQL_EDITOR_URL = "https://supabase.com/dashboard/project/raozwxavlpgvzjxkrjit/sql/new";

// ── Setup Required screen ────────────────────────────────────────────────────
function SetupRequired({ details, onRetry }: { details: SetupDetails; onRetry: () => void }) {
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [phase, setPhase] = useState<"idle" | "waiting" | "done">("idle");
  const [countdown, setCountdown] = useState(0);

  // Auto-copy SQL to clipboard as soon as this screen mounts
  useEffect(() => {
    navigator.clipboard.writeText(SETUP_SQL).catch(() => {});
    setCopied(true);
  }, []);

  function copyAgain() {
    navigator.clipboard.writeText(SETUP_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openEditorAndWait() {
    window.open(SQL_EDITOR_URL, "_blank");
    // Start auto-check loop after 15s (time for user to paste + run)
    setPhase("waiting");
    let secs = 15;
    setCountdown(secs);
    const tick = setInterval(() => {
      secs -= 1;
      setCountdown(secs);
      if (secs <= 0) {
        clearInterval(tick);
        setPhase("done");
        setChecking(true);
        onRetry();
      }
    }, 1000);
  }

  function manualRetry() {
    setChecking(true);
    setPhase("done");
    onRetry();
  }

  return (
    <div className="min-h-full bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 mb-3">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <path d="M13 2.5L2 9.5v15h6V16h10v8.5h6v-15L13 2.5z" fill="white" fillOpacity="0.15"/>
              <path d="M1.5 10h23M13 2.5v21" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
              <rect x="8" y="10" width="10" height="2.2" rx="1.1" fill="white"/>
            </svg>
          </div>
          <h1 className="font-display text-xl font-bold text-slate-900">Trainova</h1>
          <p className="text-xs text-slate-400 mt-0.5">One-time database setup needed</p>
        </div>

        {/* Table status */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-4">
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(TABLE_LABELS) as TableName[]).map((t) => {
              const ok = details.presentTables.includes(t);
              return (
                <div key={t} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                  ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                }`}>
                  <span>{ok ? "✓" : "✗"}</span>
                  {TABLE_LABELS[t]}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main CTA card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-4">
          {/* Step 1 — SQL already copied */}
          <div className="flex items-start gap-3 mb-5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${copied ? "bg-emerald-500 text-white" : "bg-indigo-600 text-white"}`}>
              {copied ? "✓" : "1"}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">SQL copied to clipboard</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {copied ? "The setup SQL is ready in your clipboard." : "SQL not yet copied."}
              </p>
              <button onClick={copyAgain} className="mt-1.5 text-xs text-indigo-500 hover:text-indigo-700 underline font-medium">
                Copy again
              </button>
            </div>
          </div>

          {/* Step 2 — Open editor */}
          <div className="flex items-start gap-3 mb-5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${phase !== "idle" ? "bg-emerald-500 text-white" : "bg-indigo-600 text-white"}`}>
              {phase !== "idle" ? "✓" : "2"}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">Open Supabase SQL Editor</p>
              <p className="text-xs text-slate-400 mt-0.5">Paste (Ctrl+V) and click <strong>Run</strong>. Wait for "Success".</p>
              <a
                href={SQL_EDITOR_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => phase === "idle" && openEditorAndWait()}
                className="inline-flex items-center gap-1.5 mt-2 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Open SQL Editor ↗
              </a>
            </div>
          </div>

          {/* Step 3 — Check */}
          <div className="flex items-start gap-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${checking ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}>
              3
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-700">Come back here and click below</p>
              {phase === "waiting" && (
                <p className="text-xs text-indigo-500 mt-1 font-medium">
                  Auto-checking in {countdown}s after you run the SQL…
                </p>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={manualRetry}
          disabled={checking}
          className="w-full bg-indigo-600 text-white rounded-xl py-3.5 text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2 shadow-md shadow-indigo-200"
        >
          {checking ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Checking all 6 tables…
            </>
          ) : (
            "✓  I've run the SQL — Continue"
          )}
        </button>

        {/* SQL preview (collapsed) */}
        <details className="mt-4">
          <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 select-none">
            View SQL ({SETUP_SQL.split('\n').length} lines)
          </summary>
          <pre className="mt-2 bg-slate-950 text-slate-300 text-xs rounded-lg p-3 overflow-auto max-h-48 leading-relaxed font-mono-data">
            {SETUP_SQL}
          </pre>
        </details>
      </div>
    </div>
  );
}

// ── App shell ────────────────────────────────────────────────────────────────
function Shell() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<Page>("dashboard");
  const [setupDetails, setSetupDetails] = useState<SetupDetails | null>(null);
  const [setupPhase, setSetupPhase] = useState<"checking" | "done">("checking");

  function runCheck() {
    setSetupPhase("checking");
    checkSetupDetails().then((d) => {
      setSetupDetails(d);
      setSetupPhase("done");
    });
  }

  useEffect(() => {
    if (!user) return;
    runCheck();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Login />;

  if (setupPhase === "checking" || !setupDetails) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50 flex-col gap-3">
        <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Checking database…</p>
      </div>
    );
  }

  if (setupDetails.state === "missing-tables") {
    return (
      <SetupRequired
        details={setupDetails}
        onRetry={() => {
          runCheck();
        }}
      />
    );
  }

  const PAGES: Record<Page, React.ReactNode> = {
    dashboard:             <Dashboard />,
    "training-master":     <TrainingMaster />,
    "training-schedule":   <TrainingSchedule />,
    "employee-groups":     <EmployeeGroups />,
    attendance:            <Attendance />,
    reports:               <Reports />,
    "employee-list":       <EmployeeList />,
    "employee-history":    <EmployeeHistory />,
    "attendance-filters":  <AttendanceFilters />,
  };

  return (
    <div className="flex h-full bg-slate-100 overflow-hidden">
      <Sidebar current={page} onNavigate={setPage} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">
          {PAGES[page]}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
