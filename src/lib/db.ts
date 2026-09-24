import { supabase } from "./supabase";

// ── Setup check ───────────────────────────────────────────────────────────────
export type SetupState = "ok" | "missing-tables";

const REQUIRED_TABLES = [
  "employees",
  "trainings",
  "employee_groups",
  "employee_group_members",
  "training_schedules",
  "attendance_records",
] as const;

export type TableName = typeof REQUIRED_TABLES[number];

export interface SetupDetails {
  state: SetupState;
  missingTables: TableName[];
  presentTables: TableName[];
}

function isDefinitelyMissing(error: any): boolean {
  if (!error) return false;
  const msg: string = (error.message ?? "").toLowerCase();
  // 42P01 = undefined_table (definitive), "relation"/"does not exist" = pg error text (definitive)
  return error.code === "42P01" || msg.includes("relation") || msg.includes("does not exist");
}

function isCacheMiss(error: any): boolean {
  if (!error) return false;
  const msg: string = (error.message ?? "").toLowerCase();
  // PGRST200 = schema cache not yet updated — table may exist, cache is stale
  return error.code === "PGRST200" || msg.includes("schema cache") || msg.includes("could not find");
}

async function checkTables(): Promise<{ missing: TableName[]; present: TableName[]; cacheOnly: TableName[] }> {
  const results = await Promise.all(
    REQUIRED_TABLES.map(async (t) => {
      const { error } = await supabase.from(t).select("id").limit(1);
      return { table: t, error };
    })
  );

  const missing: TableName[] = [];
  const present: TableName[] = [];
  const cacheOnly: TableName[] = []; // PGRST200 — may exist but cache stale

  for (const { table, error } of results) {
    if (!error) {
      present.push(table);
    } else if (isDefinitelyMissing(error)) {
      missing.push(table);
    } else if (isCacheMiss(error)) {
      cacheOnly.push(table);
    } else {
      // Auth/network/other — assume present, will surface per-page
      present.push(table);
    }
  }

  return { missing, present, cacheOnly };
}

export async function checkSetup(): Promise<SetupState> {
  const details = await checkSetupDetails();
  return details.state;
}

export async function checkSetupDetails(): Promise<SetupDetails> {
  // First pass
  let { missing, present, cacheOnly } = await checkTables();

  // If there are only schema-cache errors (no definitively missing tables),
  // retry up to 4 times (8 s total) waiting for PostgREST to refresh its cache
  for (let i = 0; i < 4 && missing.length === 0 && cacheOnly.length > 0; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const retry = await checkTables();
    missing = retry.missing;
    present = retry.present;
    cacheOnly = retry.cacheOnly;
  }

  // After retries: any remaining cacheOnly that are still failing = treat as missing
  const finalMissing = [...missing, ...cacheOnly];
  const finalPresent = present.filter((t) => !finalMissing.includes(t));

  return {
    state: finalMissing.length === 0 ? "ok" : "missing-tables",
    missingTables: finalMissing as TableName[],
    presentTables: finalPresent as TableName[],
  };
}

// ── Attendance init (client-side, no edge function needed) ────────────────────
export async function initAttendanceRecords(
  scheduleId: string,
  groupId: string,
  sessionDate: string
): Promise<void> {
  // 1. Resolve which employees belong to this group
  const { data: group, error: ge } = await supabase
    .from("employee_groups")
    .select("type, department")
    .eq("id", groupId)
    .single();
  if (ge) throw new Error(ge.message);

  let employeeIds: string[] = [];

  if (group.type === "all") {
    const { data, error } = await supabase.from("employees").select("id").eq("status", "active");
    if (error) throw new Error(error.message);
    employeeIds = (data ?? []).map((e: any) => e.id);
  } else if (group.type === "department") {
    const { data, error } = await supabase.from("employees").select("id").eq("department", group.department).eq("status", "active");
    if (error) throw new Error(error.message);
    employeeIds = (data ?? []).map((e: any) => e.id);
  } else {
    const { data, error } = await supabase.from("employee_group_members").select("employee_id").eq("group_id", groupId);
    if (error) throw new Error(error.message);
    employeeIds = (data ?? []).map((e: any) => e.employee_id);
  }

  if (employeeIds.length === 0) return;

  const isPast = new Date(sessionDate) < new Date();
  const records = employeeIds.map((eid) => ({
    schedule_id: scheduleId,
    employee_id: eid,
    attendance: "not-marked",
    completion_status: isPast ? "overdue" : "pending",
  }));

  const { error: ie } = await supabase
    .from("attendance_records")
    .upsert(records, { onConflict: "schedule_id,employee_id", ignoreDuplicates: true });
  if (ie) throw new Error(ie.message);
}

// ── Types mirrored from DB ────────────────────────────────────────────────────
export interface DbEmployee {
  id: string;
  employee_code: string;
  name: string;
  email: string | null;
  department: string;
  role: string;
  status: string;
  created_at: string;
  phone?: string | null;
  designation?: string | null;
  joining_date?: string | null;
}

export interface DbTraining {
  id: string;
  code: string;
  name: string;
  frequency: string;
  description: string;
  status: string;
  created_by: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbEmployeeGroup {
  id: string;
  name: string;
  type: "all" | "department" | "selected";
  department: string | null;
  description: string | null;
  created_at: string;
  member_count?: number;
}

export interface DbSchedule {
  id: string;
  training_id: string;
  group_id: string;
  session_date: string;
  trainer: string;
  frequency: string;
  status: string;
  notes: string | null;
  created_at: string;
  training?: DbTraining;
  employee_group?: DbEmployeeGroup;
}

export interface DbAttendance {
  id: string;
  schedule_id: string;
  employee_id: string;
  attendance: string;
  completion_status: string;
  marked_at: string | null;
  marked_by: string | null;
  employee?: DbEmployee;
}

function handle<T>(data: T | null, error: any): T {
  if (error) throw new Error(error.message ?? "Database error");
  if (data === null) throw new Error("No data returned");
  return data;
}

// ── Employees ─────────────────────────────────────────────────────────────────
export async function fetchEmployees(): Promise<DbEmployee[]> {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("status", "active")
    .order("name");
  return handle(data, error) as DbEmployee[];
}

/** Fetch ALL employees (active + inactive) for HR management */
export async function fetchAllEmployees(): Promise<DbEmployee[]> {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("name");
  return handle(data, error) as DbEmployee[];
}

/** Create a new employee — validates for duplicate employee_code and email */
export async function createEmployee(emp: {
  employee_code: string;
  name: string;
  email?: string;
  phone?: string;
  department: string;
  role: string;
  designation?: string;
  joining_date?: string;
}): Promise<DbEmployee> {
  // Check for duplicate employee_code
  const { data: existing } = await supabase
    .from("employees")
    .select("id, employee_code, email")
    .or(`employee_code.eq.${emp.employee_code}${emp.email ? `,email.eq.${emp.email}` : ""}`);

  if (existing && existing.length > 0) {
    const dupCode = existing.find((e: any) => e.employee_code === emp.employee_code);
    const dupEmail = emp.email && existing.find((e: any) => e.email === emp.email);
    if (dupCode) throw new Error(`Employee code "${emp.employee_code}" already exists.`);
    if (dupEmail) throw new Error(`Email "${emp.email}" is already registered.`);
  }

  const payload: any = {
    employee_code: emp.employee_code,
    name: emp.name,
    email: emp.email || null,
    department: emp.department,
    role: emp.role,
    status: "active",
  };
  // Optional extended fields (gracefully ignored if columns don't exist yet)
  if (emp.phone !== undefined) payload.phone = emp.phone || null;
  if (emp.designation !== undefined) payload.designation = emp.designation || null;
  if (emp.joining_date !== undefined) payload.joining_date = emp.joining_date || null;

  const { data, error } = await supabase
    .from("employees")
    .insert(payload)
    .select()
    .single();
  return handle(data, error) as DbEmployee;
}

/** Activate or deactivate an employee (soft delete) */
export async function updateEmployeeStatus(id: string, status: "active" | "inactive"): Promise<void> {
  const { error } = await supabase
    .from("employees")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Trainings ─────────────────────────────────────────────────────────────────
export async function fetchTrainings(): Promise<DbTraining[]> {
  const { data, error } = await supabase
    .from("trainings")
    .select("*")
    .eq("is_deleted", false)
    .order("created_at");
  return handle(data, error) as DbTraining[];
}

export async function createTraining(t: {
  name: string;
  frequency: string;
  description: string;
  created_by: string;
}): Promise<DbTraining> {
  const code = `T${Date.now().toString().slice(-4)}`;
  const { data, error } = await supabase
    .from("trainings")
    .insert({ ...t, code, status: "active", is_deleted: false })
    .select()
    .single();
  return handle(data, error) as DbTraining;
}

export async function updateTraining(
  id: string,
  patch: Partial<{ name: string; frequency: string; description: string; status: string }>
): Promise<void> {
  const { error } = await supabase
    .from("trainings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Employee Groups ───────────────────────────────────────────────────────────
export async function fetchGroups(): Promise<DbEmployeeGroup[]> {
  const { data: groups, error } = await supabase
    .from("employee_groups")
    .select("*")
    .order("created_at");
  if (error) throw new Error(error.message);

  // Attach member counts
  const { data: counts } = await supabase
    .from("employee_group_members")
    .select("group_id");

  const countMap: Record<string, number> = {};
  (counts ?? []).forEach((r: any) => {
    countMap[r.group_id] = (countMap[r.group_id] ?? 0) + 1;
  });

  return (groups ?? []).map((g: any) => ({ ...g, member_count: countMap[g.id] ?? 0 }));
}

export async function fetchGroupMembers(groupId: string): Promise<DbEmployee[]> {
  const { data, error } = await supabase
    .from("employee_group_members")
    .select("employees(*)")
    .eq("group_id", groupId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => r.employees as DbEmployee).filter(Boolean);
}

export async function createGroup(g: {
  name: string;
  type: string;
  department?: string | null;
  description?: string | null;
  employeeIds?: string[];
}): Promise<DbEmployeeGroup> {
  const { data: group, error } = await supabase
    .from("employee_groups")
    .insert({ name: g.name, type: g.type, department: g.department ?? null, description: g.description ?? null })
    .select()
    .single();
  if (error) throw new Error(error.message);

  let memberIds: string[] = [];
  if (g.type === "all") {
    const { data: emps } = await supabase.from("employees").select("id").eq("status", "active");
    memberIds = (emps ?? []).map((e: any) => e.id);
  } else if (g.type === "department" && g.department) {
    const { data: emps } = await supabase.from("employees").select("id").eq("department", g.department).eq("status", "active");
    memberIds = (emps ?? []).map((e: any) => e.id);
  } else if (g.type === "selected" && g.employeeIds) {
    memberIds = g.employeeIds;
  }

  if (memberIds.length > 0) {
    const members = memberIds.map((eid) => ({ group_id: group.id, employee_id: eid }));
    const { error: me } = await supabase.from("employee_group_members").insert(members);
    if (me) throw new Error(me.message);
  }

  return group as DbEmployeeGroup;
}

// ── Training Schedules ────────────────────────────────────────────────────────
export async function fetchSchedules(): Promise<DbSchedule[]> {
  const { data, error } = await supabase
    .from("training_schedules")
    .select("*, training:training_id(id,code,name,frequency,status), employee_group:group_id(id,name,type,department)")
    .order("session_date", { ascending: false });
  return handle(data, error) as DbSchedule[];
}

export async function createSchedule(s: {
  training_id: string;
  group_id: string;
  session_date: string;
  trainer: string;
  frequency: string;
  status: string;
  notes?: string;
}): Promise<DbSchedule> {
  const { data, error } = await supabase
    .from("training_schedules")
    .insert(s)
    .select()
    .single();
  return handle(data, error) as DbSchedule;
}

export async function updateScheduleStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase.from("training_schedules").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Attendance ────────────────────────────────────────────────────────────────
export async function fetchAttendanceForSchedule(scheduleId: string): Promise<DbAttendance[]> {
  const { data, error } = await supabase
    .from("attendance_records")
    .select("*, employee:employee_id(id, employee_code, name, department, role)")
    .eq("schedule_id", scheduleId)
    .order("employee_id");
  return handle(data, error) as DbAttendance[];
}

export async function markAttendance(
  scheduleId: string,
  employeeId: string,
  attendance: string,
  sessionDate: string,
  markedBy: string
): Promise<void> {
  const isPast = new Date(sessionDate) < new Date();
  let completionStatus: string;
  if (attendance === "present") {
    completionStatus = "completed";
  } else {
    completionStatus = isPast ? "overdue" : "pending";
  }

  const { error } = await supabase
    .from("attendance_records")
    .upsert(
      {
        schedule_id: scheduleId,
        employee_id: employeeId,
        attendance,
        completion_status: completionStatus,
        marked_at: new Date().toISOString(),
        marked_by: markedBy,
      },
      { onConflict: "schedule_id,employee_id" }
    );
  if (error) throw new Error(error.message);
}

// ── Dashboard Stats ───────────────────────────────────────────────────────────
export async function fetchDashboardStats() {
  const [trainings, employees, groups, schedules, attendance] = await Promise.all([
    supabase.from("trainings").select("id", { count: "exact" }).eq("status", "active").eq("is_deleted", false),
    supabase.from("employees").select("id", { count: "exact" }).eq("status", "active"),
    supabase.from("employee_groups").select("id", { count: "exact" }),
    supabase.from("training_schedules").select("id,status,session_date", { count: "exact" }),
    supabase.from("attendance_records").select("completion_status"),
  ]);

  const upcomingCount = (schedules.data ?? []).filter((s: any) => s.status === "upcoming").length;

  const completionCounts = { completed: 0, pending: 0, overdue: 0 };
  (attendance.data ?? []).forEach((r: any) => {
    if (r.completion_status in completionCounts) {
      completionCounts[r.completion_status as keyof typeof completionCounts]++;
    }
  });

  const total = completionCounts.completed + completionCounts.pending + completionCounts.overdue;
  const attendanceRate = total > 0 ? Math.round((completionCounts.completed / total) * 100) : 0;

  return {
    activeTrainings: trainings.count ?? 0,
    totalEmployees: employees.count ?? 0,
    totalGroups: groups.count ?? 0,
    upcomingSchedules: upcomingCount,
    ...completionCounts,
    attendanceRate,
  };
}

// ── Reports ───────────────────────────────────────────────────────────────────
export interface ReportRow {
  scheduleId: string;
  trainingName: string;
  scheduleDate: string;
  trainer: string;
  groupName: string;
  employeeId: string;
  employeeName: string;
  department: string;
  role: string;
  employeeCode: string;
  attendance: string;
  completionStatus: string;
}

export async function fetchReportRows(): Promise<ReportRow[]> {
  const { data, error } = await supabase
    .from("attendance_records")
    .select(`
      id,
      attendance,
      completion_status,
      schedule_id,
      employee:employee_id(id, employee_code, name, department, role),
      schedule:schedule_id(
        id, session_date, trainer,
        training:training_id(name),
        employee_group:group_id(name)
      )
    `)
    .not("schedule_id", "is", null);

  if (error) throw new Error(error.message);

  return (data ?? []).map((r: any) => ({
    scheduleId: r.schedule_id,
    trainingName: r.schedule?.training?.name ?? "—",
    scheduleDate: r.schedule?.session_date ?? "",
    trainer: r.schedule?.trainer ?? "—",
    groupName: r.schedule?.employee_group?.name ?? "—",
    employeeId: r.employee?.id ?? "",
    employeeName: r.employee?.name ?? "—",
    department: r.employee?.department ?? "—",
    role: r.employee?.role ?? "—",
    employeeCode: r.employee?.employee_code ?? "—",
    attendance: r.attendance,
    completionStatus: r.completion_status,
  }));
}

// ── Employee History ───────────────────────────────────────────────────────────
export interface EmployeeHistoryRow {
  scheduleId: string;
  trainingName: string;
  trainingCode: string;
  scheduleDate: string;
  trainer: string;
  groupName: string;
  scheduleStatus: string;
  attendance: string;
  completionStatus: string;
  markedAt: string | null;
}

export async function fetchEmployeeHistory(employeeId: string): Promise<EmployeeHistoryRow[]> {
  const { data, error } = await supabase
    .from("attendance_records")
    .select(`
      id,
      attendance,
      completion_status,
      marked_at,
      schedule:schedule_id(
        id, session_date, trainer, status,
        training:training_id(name, code),
        employee_group:group_id(name)
      )
    `)
    .eq("employee_id", employeeId)
    .order("id");

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((r: any) => ({
      scheduleId: r.schedule?.id ?? "",
      trainingName: r.schedule?.training?.name ?? "—",
      trainingCode: r.schedule?.training?.code ?? "—",
      scheduleDate: r.schedule?.session_date ?? "",
      trainer: r.schedule?.trainer ?? "—",
      groupName: r.schedule?.employee_group?.name ?? "—",
      scheduleStatus: r.schedule?.status ?? "—",
      attendance: r.attendance,
      completionStatus: r.completion_status,
      markedAt: r.marked_at,
    }))
    .sort((a: EmployeeHistoryRow, b: EmployeeHistoryRow) =>
      b.scheduleDate.localeCompare(a.scheduleDate)
    );
}

// ── Attendance Filters ─────────────────────────────────────────────────────────
export interface AttendanceFilterRow {
  recordId: string;
  scheduleId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  role: string;
  trainingName: string;
  scheduleDate: string;
  scheduleStatus: string;
  attendance: string;
  completionStatus: string;
}

export async function fetchAttendanceForFilters(scheduleId: string): Promise<AttendanceFilterRow[]> {
  const { data, error } = await supabase
    .from("attendance_records")
    .select(`
      id,
      schedule_id,
      employee_id,
      attendance,
      completion_status,
      employee:employee_id(id, employee_code, name, department, role),
      schedule:schedule_id(
        id, session_date, status,
        training:training_id(name)
      )
    `)
    .eq("schedule_id", scheduleId)
    .order("employee_id");

  if (error) throw new Error(error.message);

  return (data ?? []).map((r: any) => ({
    recordId: r.id,
    scheduleId: r.schedule_id,
    employeeId: r.employee?.id ?? "",
    employeeCode: r.employee?.employee_code ?? "—",
    employeeName: r.employee?.name ?? "—",
    department: r.employee?.department ?? "—",
    role: r.employee?.role ?? "—",
    trainingName: r.schedule?.training?.name ?? "—",
    scheduleDate: r.schedule?.session_date ?? "",
    scheduleStatus: r.schedule?.status ?? "—",
    attendance: r.attendance,
    completionStatus: r.completion_status,
  }));
}
