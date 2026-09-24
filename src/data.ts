import type {
  Employee,
  Training,
  EmployeeGroup,
  TrainingSchedule,
  AttendanceRecord,
  AttendanceStatus,
  CompletionStatus,
} from "./types";

export const TODAY = new Date("2026-09-02");

export function deriveCompletion(
  attendanceStatus: AttendanceStatus | undefined,
  scheduleDate: string
): CompletionStatus {
  if (attendanceStatus === "present") return "completed";
  const past = new Date(scheduleDate) < TODAY;
  return past ? "overdue" : "pending";
}

export const EMPLOYEES: Employee[] = [
  { id: "e1",  name: "Sarah Chen",      email: "s.chen@antigravity.com",    department: "Engineering", role: "Engineering Lead",       employeeId: "EMP-001" },
  { id: "e2",  name: "Michael Torres",  email: "m.torres@antigravity.com",  department: "Engineering", role: "Software Engineer",      employeeId: "EMP-002" },
  { id: "e3",  name: "Aisha Johnson",   email: "a.johnson@antigravity.com", department: "Engineering", role: "Software Engineer",      employeeId: "EMP-003" },
  { id: "e4",  name: "Priya Sharma",    email: "p.sharma@antigravity.com",  department: "HR",          role: "HR Manager",             employeeId: "EMP-004" },
  { id: "e5",  name: "Nina Patel",      email: "n.patel@antigravity.com",   department: "HR",          role: "HR Coordinator",         employeeId: "EMP-005" },
  { id: "e6",  name: "James Okafor",    email: "j.okafor@antigravity.com",  department: "Finance",     role: "Financial Analyst",      employeeId: "EMP-006" },
  { id: "e7",  name: "Tom Bradley",     email: "t.bradley@antigravity.com", department: "Finance",     role: "Accountant",             employeeId: "EMP-007" },
  { id: "e8",  name: "Rachel Green",    email: "r.green@antigravity.com",   department: "Finance",     role: "Financial Controller",   employeeId: "EMP-008" },
  { id: "e9",  name: "Emma Wilson",     email: "e.wilson@antigravity.com",  department: "Operations",  role: "Operations Manager",     employeeId: "EMP-009" },
  { id: "e10", name: "Carlos Rivera",   email: "c.rivera@antigravity.com",  department: "Operations",  role: "Operations Analyst",     employeeId: "EMP-010" },
  { id: "e11", name: "David Kim",       email: "d.kim@antigravity.com",     department: "Marketing",   role: "Marketing Director",     employeeId: "EMP-011" },
  { id: "e12", name: "Sophie Dubois",   email: "s.dubois@antigravity.com",  department: "Marketing",   role: "Marketing Specialist",   employeeId: "EMP-012" },
  { id: "e13", name: "Kevin O'Brien",   email: "k.obrien@antigravity.com",  department: "IT",          role: "IT Manager",             employeeId: "EMP-013" },
  { id: "e14", name: "Lisa Anderson",   email: "l.anderson@antigravity.com",department: "IT",          role: "IT Specialist",          employeeId: "EMP-014" },
  { id: "e15", name: "Robert Martinez", email: "r.martinez@antigravity.com",department: "Legal",       role: "Legal Counsel",          employeeId: "EMP-015" },
];

export const INITIAL_TRAININGS: Training[] = [
  {
    id: "t1", name: "Cyber Security Awareness", frequency: "Quarterly",
    description: "Covers phishing, password hygiene, social engineering, and secure remote-work practices.",
    status: "active", createdAt: "2025-01-10", updatedAt: "2025-01-10", createdBy: "Priya Sharma",
  },
  {
    id: "t2", name: "Fire Safety Procedures", frequency: "Quarterly",
    description: "Emergency evacuation, fire extinguisher use, and building safety protocols.",
    status: "active", createdAt: "2025-01-10", updatedAt: "2025-01-10", createdBy: "Priya Sharma",
  },
  {
    id: "t3", name: "ISO 9001 Quality Awareness", frequency: "Quarterly",
    description: "Quality management system principles, documentation standards, and continuous improvement.",
    status: "active", createdAt: "2025-01-12", updatedAt: "2025-01-12", createdBy: "Priya Sharma",
  },
  {
    id: "t4", name: "AI Tools & Productivity", frequency: "As Required",
    description: "Hands-on workshop covering LLM tools, AI-assisted workflows, and responsible usage guidelines.",
    status: "active", createdAt: "2025-03-05", updatedAt: "2025-06-01", createdBy: "Sarah Chen",
  },
  {
    id: "t5", name: "Data Privacy & GDPR", frequency: "Annual",
    description: "Personal data handling obligations, subject access requests, and breach reporting under GDPR.",
    status: "active", createdAt: "2025-01-15", updatedAt: "2025-01-15", createdBy: "Robert Martinez",
  },
  {
    id: "t6", name: "Workplace Health & Safety", frequency: "Annual",
    description: "Ergonomics, manual handling, incident reporting, and mental health awareness.",
    status: "active", createdAt: "2025-01-15", updatedAt: "2025-01-15", createdBy: "Priya Sharma",
  },
  {
    id: "t7", name: "Leadership Essentials", frequency: "As Required",
    description: "Performance conversations, delegation, conflict resolution, and inclusive leadership practices.",
    status: "active", createdAt: "2025-04-20", updatedAt: "2025-04-20", createdBy: "Priya Sharma",
  },
  {
    id: "t8", name: "Customer Service Excellence", frequency: "Annual",
    description: "Communication skills, handling escalations, SLA adherence, and customer satisfaction metrics.",
    status: "active", createdAt: "2025-02-01", updatedAt: "2025-02-01", createdBy: "David Kim",
  },
];

export const INITIAL_GROUPS: EmployeeGroup[] = [
  {
    id: "g1", name: "All Employees", type: "all",
    createdAt: "2025-01-01", description: "Every active employee in the organisation",
  },
  {
    id: "g2", name: "Engineering Team", type: "department", department: "Engineering",
    createdAt: "2025-01-05", description: "All Engineering department members",
  },
  {
    id: "g3", name: "Finance & Legal", type: "selected",
    employeeIds: ["e6","e7","e8","e15"],
    createdAt: "2025-02-10", description: "Finance analysts and legal counsel",
  },
  {
    id: "g4", name: "Leadership Team", type: "selected",
    employeeIds: ["e1","e4","e9","e11","e13"],
    createdAt: "2025-03-01", description: "Department heads and senior managers",
  },
  {
    id: "g5", name: "IT & Engineering", type: "selected",
    employeeIds: ["e1","e2","e3","e13","e14"],
    createdAt: "2025-04-15", description: "Combined IT and Engineering staff",
  },
];

export const INITIAL_SCHEDULES: TrainingSchedule[] = [
  { id:"s1",  trainingId:"t1", groupId:"g1", date:"2026-01-15", trainer:"Alex Foster",      frequency:"Quarterly",   status:"completed",   createdAt:"2025-12-20" },
  { id:"s2",  trainingId:"t2", groupId:"g1", date:"2026-02-10", trainer:"Mark Davies",      frequency:"Quarterly",   status:"completed",   createdAt:"2025-12-20" },
  { id:"s3",  trainingId:"t3", groupId:"g1", date:"2026-03-05", trainer:"Jennifer Lee",     frequency:"Quarterly",   status:"completed",   createdAt:"2026-01-10" },
  { id:"s4",  trainingId:"t4", groupId:"g2", date:"2026-04-20", trainer:"Sarah Chen",       frequency:"As Required", status:"completed",   createdAt:"2026-03-15" },
  { id:"s5",  trainingId:"t1", groupId:"g1", date:"2026-06-15", trainer:"Alex Foster",      frequency:"Quarterly",   status:"completed",   createdAt:"2026-05-01", notes:"Q2 session — higher attendance expected." },
  { id:"s6",  trainingId:"t2", groupId:"g1", date:"2026-06-10", trainer:"Mark Davies",      frequency:"Quarterly",   status:"completed",   createdAt:"2026-05-01" },
  { id:"s7",  trainingId:"t5", groupId:"g1", date:"2026-09-15", trainer:"Robert Martinez",  frequency:"Annual",      status:"upcoming",    createdAt:"2026-08-01" },
  { id:"s8",  trainingId:"t7", groupId:"g4", date:"2026-10-05", trainer:"Priya Sharma",     frequency:"As Required", status:"upcoming",    createdAt:"2026-08-15" },
  { id:"s9",  trainingId:"t6", groupId:"g1", date:"2026-09-20", trainer:"Emma Wilson",      frequency:"Annual",      status:"upcoming",    createdAt:"2026-08-01" },
  { id:"s10", trainingId:"t3", groupId:"g1", date:"2026-08-28", trainer:"Jennifer Lee",     frequency:"Quarterly",   status:"in-progress", createdAt:"2026-07-10", notes:"Q3 session — attendance marking in progress." },
];

// Pre-populate attendance for completed + in-progress schedules
// s1: All 15 present
const s1 = EMPLOYEES.map((e, i): AttendanceRecord => ({
  id: `a${i+1}`, scheduleId: "s1", employeeId: e.id,
  attendanceStatus: "present", completionStatus: "completed",
  markedAt: "2026-01-15", markedBy: "Priya Sharma",
}));

// s2: 13 present, e6 and e12 absent -> overdue
const s2 = EMPLOYEES.map((e, i): AttendanceRecord => {
  const absent = e.id === "e6" || e.id === "e12";
  return {
    id: `a${16+i}`, scheduleId: "s2", employeeId: e.id,
    attendanceStatus: absent ? "absent" : "present",
    completionStatus: absent ? "overdue" : "completed",
    markedAt: "2026-02-10", markedBy: "Priya Sharma",
  };
});

// s3: 14 present, e10 absent -> overdue
const s3 = EMPLOYEES.map((e, i): AttendanceRecord => {
  const absent = e.id === "e10";
  return {
    id: `a${31+i}`, scheduleId: "s3", employeeId: e.id,
    attendanceStatus: absent ? "absent" : "present",
    completionStatus: absent ? "overdue" : "completed",
    markedAt: "2026-03-05", markedBy: "Priya Sharma",
  };
});

// s4: Engineering only (e1,e2,e3) all present
const s4Employees = ["e1","e2","e3"];
const s4 = s4Employees.map((eid, i): AttendanceRecord => ({
  id: `a${46+i}`, scheduleId: "s4", employeeId: eid,
  attendanceStatus: "present", completionStatus: "completed",
  markedAt: "2026-04-20", markedBy: "Sarah Chen",
}));

// s5: All 15, e7/e11/e15 absent -> overdue
const s5 = EMPLOYEES.map((e, i): AttendanceRecord => {
  const absent = ["e7","e11","e15"].includes(e.id);
  return {
    id: `a${50+i}`, scheduleId: "s5", employeeId: e.id,
    attendanceStatus: absent ? "absent" : "present",
    completionStatus: absent ? "overdue" : "completed",
    markedAt: "2026-06-15", markedBy: "Priya Sharma",
  };
});

// s6: All 15, e3/e14 absent -> overdue
const s6 = EMPLOYEES.map((e, i): AttendanceRecord => {
  const absent = e.id === "e3" || e.id === "e14";
  return {
    id: `a${65+i}`, scheduleId: "s6", employeeId: e.id,
    attendanceStatus: absent ? "absent" : "present",
    completionStatus: absent ? "overdue" : "completed",
    markedAt: "2026-06-10", markedBy: "Priya Sharma",
  };
});

// s10: All 15, only e1/e4/e9 marked present, e3 marked absent, rest not-marked -> overdue
const s10MarkedPresent = ["e1","e4","e9"];
const s10MarkedAbsent = ["e3"];
const s10 = EMPLOYEES.map((e, i): AttendanceRecord => {
  const isPresent = s10MarkedPresent.includes(e.id);
  const isAbsent  = s10MarkedAbsent.includes(e.id);
  const status: AttendanceStatus = isPresent ? "present" : isAbsent ? "absent" : "not-marked";
  const completion: CompletionStatus = isPresent ? "completed" : "overdue";
  return {
    id: `a${80+i}`, scheduleId: "s10", employeeId: e.id,
    attendanceStatus: status, completionStatus: completion,
    markedAt: status !== "not-marked" ? "2026-08-28" : undefined,
    markedBy: status !== "not-marked" ? "Priya Sharma" : undefined,
  };
});

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  ...s1, ...s2, ...s3, ...s4, ...s5, ...s6, ...s10,
];
