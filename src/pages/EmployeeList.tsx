import { useState, useMemo } from "react";
import { useQuery } from "../hooks/useQuery";
import {
  fetchAllEmployees,
  createEmployee,
  updateEmployeeStatus,
  type DbEmployee,
} from "../lib/db";
import {
  PageHeader, Btn, Field, Input, Select, Modal, Table, TR, TD, Empty, StatCard,
} from "../components/UI";
import { Spinner, ErrorMsg } from "../components/Status";
import {
  UserPlusIcon, SearchIcon, UsersIcon, CheckIcon, AlertIcon,
} from "../components/Icons";

const DEPARTMENTS = ["Engineering", "HR", "Finance", "Operations", "Marketing", "IT", "Legal"];

interface AddForm {
  employee_code: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  designation: string;
  joining_date: string;
}

const EMPTY_FORM: AddForm = {
  employee_code: "",
  name: "",
  email: "",
  phone: "",
  department: "Engineering",
  role: "",
  designation: "",
  joining_date: "",
};

export default function EmployeeList() {
  const { data: employees, loading, error, refetch } = useQuery(fetchAllEmployees);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<AddForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [confirmDeactivate, setConfirmDeactivate] = useState<DbEmployee | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const all = employees ?? [];

  const filtered = useMemo(() => {
    return all.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (deptFilter !== "all" && e.department !== deptFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          e.name.toLowerCase().includes(q) ||
          e.employee_code.toLowerCase().includes(q) ||
          (e.email ?? "").toLowerCase().includes(q) ||
          e.role.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [all, statusFilter, deptFilter, search]);

  const activeCount   = all.filter((e) => e.status === "active").length;
  const inactiveCount = all.filter((e) => e.status === "inactive").length;

  function setField(k: keyof AddForm, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setSaveError(null);
  }

  async function handleAdd() {
    if (!form.employee_code.trim()) { setSaveError("Employee Code is required."); return; }
    if (!form.name.trim())          { setSaveError("Name is required."); return; }
    if (!form.department)           { setSaveError("Department is required."); return; }
    if (!form.role.trim())          { setSaveError("Role / Job Title is required."); return; }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setSaveError("Please enter a valid email address."); return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await createEmployee({
        employee_code: form.employee_code.trim(),
        name:          form.name.trim(),
        email:         form.email.trim() || undefined,
        phone:         form.phone.trim() || undefined,
        department:    form.department,
        role:          form.role.trim(),
        designation:   form.designation.trim() || undefined,
        joining_date:  form.joining_date || undefined,
      });
      setShowAdd(false);
      setForm(EMPTY_FORM);
      refetch();
    } catch (e: any) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(emp: DbEmployee) {
    if (emp.status === "active") {
      setConfirmDeactivate(emp);
      return;
    }
    setToggling(emp.id);
    try {
      await updateEmployeeStatus(emp.id, "active");
      refetch();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setToggling(null);
    }
  }

  async function confirmDeactivation() {
    if (!confirmDeactivate) return;
    setToggling(confirmDeactivate.id);
    setConfirmDeactivate(null);
    try {
      await updateEmployeeStatus(confirmDeactivate.id, "inactive");
      refetch();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setToggling(null);
    }
  }

  if (loading) return <Spinner />;
  if (error)   return <ErrorMsg message={error} />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Employee List"
        subtitle="Manage all employees — add, view, activate, or deactivate"
        action={
          <Btn onClick={() => { setShowAdd(true); setSaveError(null); setForm(EMPTY_FORM); }}>
            <UserPlusIcon size={15} /> Add Employee
          </Btn>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Employees" value={all.length}    accent="bg-indigo-50 text-indigo-600"   icon={<UsersIcon size={18} />} />
        <StatCard label="Active"          value={activeCount}   accent="bg-emerald-50 text-emerald-600" icon={<CheckIcon size={18} />} />
        <StatCard label="Inactive"        value={inactiveCount} accent="bg-slate-100 text-slate-500"    icon={<AlertIcon size={18} />} />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative">
          <SearchIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 w-56"
            placeholder="Search name, code, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="border border-slate-200 bg-white rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Departments</option>
          {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
        </select>
        <div className="flex gap-1">
          {(["all", "active", "inactive"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize ${statusFilter === s ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
            >
              {s === "all" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} employee{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
        {filtered.length === 0 ? (
          <Empty message="No employees match your filters." />
        ) : (
          <Table headers={["Employee", "Dept.", "Role", "Email", "Status", "Action"]}>
            {filtered.map((emp) => (
              <TR key={emp.id}>
                <TD>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{emp.name}</p>
                    <p className="font-mono-data text-xs text-slate-400">{emp.employee_code}</p>
                  </div>
                </TD>
                <TD>{emp.department}</TD>
                <TD>{emp.role}</TD>
                <TD><span className="text-xs text-slate-500">{emp.email ?? "—"}</span></TD>
                <TD>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ${emp.status === "active" ? "bg-emerald-50 text-emerald-700 ring-emerald-200/60" : "bg-slate-100 text-slate-500 ring-slate-200"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${emp.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />
                    {emp.status === "active" ? "Active" : "Inactive"}
                  </span>
                </TD>
                <TD>
                  <button
                    onClick={() => handleToggleStatus(emp)}
                    disabled={toggling === emp.id}
                    className={`px-3 py-1 text-xs font-medium rounded-md border transition-all disabled:opacity-50 ${emp.status === "active" ? "text-red-600 border-red-200 hover:bg-red-50" : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"}`}
                  >
                    {toggling === emp.id ? "..." : emp.status === "active" ? "Deactivate" : "Activate"}
                  </button>
                </TD>
              </TR>
            ))}
          </Table>
        )}
      </div>

      {showAdd && (
        <Modal title="Add New Employee" onClose={() => setShowAdd(false)} width="max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Employee Code" required><Input placeholder="e.g. EMP-016" value={form.employee_code} onChange={(e) => setField("employee_code", e.target.value)} /></Field>
            <Field label="Full Name" required><Input placeholder="e.g. Jane Smith" value={form.name} onChange={(e) => setField("name", e.target.value)} /></Field>
            <Field label="Email"><Input type="email" placeholder="jane@company.com" value={form.email} onChange={(e) => setField("email", e.target.value)} /></Field>
            <Field label="Phone"><Input type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={(e) => setField("phone", e.target.value)} /></Field>
            <Field label="Department" required><Select value={form.department} onChange={(e) => setField("department", e.target.value)}>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</Select></Field>
            <Field label="Role / Job Title" required><Input placeholder="e.g. Software Engineer" value={form.role} onChange={(e) => setField("role", e.target.value)} /></Field>
            <Field label="Designation"><Input placeholder="e.g. Senior Engineer" value={form.designation} onChange={(e) => setField("designation", e.target.value)} /></Field>
            <Field label="Joining Date"><Input type="date" value={form.joining_date} onChange={(e) => setField("joining_date", e.target.value)} /></Field>
          </div>
          {saveError && <div className="mt-4 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5 text-sm text-red-600">{saveError}</div>}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
            <Btn variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Btn>
            <Btn onClick={handleAdd} disabled={saving}>{saving ? "Saving..." : "Add Employee"}</Btn>
          </div>
        </Modal>
      )}

      {confirmDeactivate && (
        <Modal title="Confirm Deactivation" onClose={() => setConfirmDeactivate(null)} width="max-w-md">
          <div className="space-y-3">
            <p className="text-sm text-slate-700">Are you sure you want to <strong>deactivate</strong> <strong>{confirmDeactivate.name}</strong> ({confirmDeactivate.employee_code})?</p>
            <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-xs text-amber-700">
              <strong>Note:</strong> The employee will be set to Inactive. All existing training history, attendance records, and enrollments will be preserved. You can reactivate at any time.
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
            <Btn variant="secondary" onClick={() => setConfirmDeactivate(null)}>Cancel</Btn>
            <Btn variant="danger" onClick={confirmDeactivation}>Deactivate Employee</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
