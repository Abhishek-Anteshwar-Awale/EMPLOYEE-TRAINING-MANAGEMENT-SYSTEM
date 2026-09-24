export type Department =
  | "Engineering"
  | "HR"
  | "Finance"
  | "Operations"
  | "Marketing"
  | "IT"
  | "Legal";

export type TrainingFrequency =
  | "Quarterly"
  | "Annual"
  | "Monthly"
  | "As Required"
  | "One-time";

export type GroupType = "all" | "department" | "selected";

export type AttendanceStatus = "present" | "absent" | "not-marked";

export type CompletionStatus = "completed" | "pending" | "overdue";

export type TrainingStatus = "active" | "inactive";

export type ScheduleStatus =
  | "upcoming"
  | "in-progress"
  | "completed"
  | "cancelled";

export type Page =
  | "dashboard"
  | "training-master"
  | "training-schedule"
  | "employee-groups"
  | "attendance"
  | "reports"
  | "employee-list"
  | "employee-history"
  | "attendance-filters";

export type EmployeeStatus = "active" | "inactive";

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: Department;
  role: string;
  employeeId: string;
  status?: EmployeeStatus;
  phone?: string;
  designation?: string;
  joiningDate?: string;
}

export interface Training {
  id: string;
  name: string;
  frequency: TrainingFrequency;
  description: string;
  status: TrainingStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isDeleted?: boolean;
}

export interface EmployeeGroup {
  id: string;
  name: string;
  type: GroupType;
  department?: Department;
  employeeIds?: string[];
  createdAt: string;
  description?: string;
}

export interface TrainingSchedule {
  id: string;
  trainingId: string;
  groupId: string;
  date: string;
  trainer: string;
  frequency: TrainingFrequency;
  status: ScheduleStatus;
  createdAt: string;
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  scheduleId: string;
  employeeId: string;
  attendanceStatus: AttendanceStatus;
  completionStatus: CompletionStatus;
  markedAt?: string;
  markedBy?: string;
}
