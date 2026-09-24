import { useState } from "react";
import { useQuery } from "../hooks/useQuery";
import { fetchGroups, fetchGroupMembers, fetchEmployees, createGroup, type DbEmployeeGroup, type DbEmployee } from "../lib/db";
import {
  Modal, PageHeader, Btn, Field, Input, Select,
  Table, TR, TD, Empty,
} from "../components/UI";
import { Spinner, ErrorMsg } from "../components/Status";
import { PlusIcon, UsersIcon } from "../components/Icons";

const DEPARTMENTS = ["Engineering", "HR", "Finance", "Operations", "Marketing", "IT", "Legal"];

const groupTypeCls: Record<string, string> = {
  all: "bg-indigo-50 text-indigo-700",
  department: "bg-blue-50 text-blue-700",
  selected: "bg-violet-50 text-violet-700",
};
const groupTypeLabel: Record<string, string> = {
  all: "All Employees", department: "Department", selected: "Selected Employees",
};

function GroupMembersPanel({ groupId }: { groupId: string }) {
  const { data: members, loading } = useQuery(() => fetchGroupMembers(groupId), [groupId]);
  if (loading) return <p className="text-xs text-slate-400 p-4 text-center">Loading members…</p>;
  if (!members?.length) return <p className="text-sm text-slate-400 p-4 text-center">No members</p>;
  return (
    <Table headers={["Employee ID", "Name", "Department", "Role"]}>
      {members.map((e) => (
        <TR key={e.id}>
          <TD mono>{e.employee_code}</TD>
          <TD><span className="font-medium text-slate-800">{e.name}</span></TD>
          <TD>{e.department}</TD>
          <TD>{e.role}</TD>
        </TR>
      ))}
    </Table>
  );
}

interface FormState {
  name: string;
  type: string;
  department: string;
  employeeIds: string[];
  description: string;
}

export default function EmployeeGroups() {
  const { data: groups, loading, error, refetch } = useQuery(fetchGroups);
  const { data: employees } = useQuery(fetchEmployees);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>({ name: "", type: "all", department: "", employeeIds: [], description: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setForm({ name: "", type: "all", department: "", employeeIds: [], description: "" });
    setFormError("");
    setShowModal(true);
  }

  async function handleSubmit() {
    if (!form.name.trim()) { setFormError("Group name is required."); return; }
    if (form.type === "department" && !form.department) { setFormError("Select a department."); return; }
    if (form.type === "selected" && form.employeeIds.length === 0) { setFormError("Select at least one employee."); return; }
    setSaving(true);
    setFormError("");
    try {
      await createGroup({
        name: form.name,
        type: form.type,
        department: form.type === "department" ? form.department : null,
        description: form.description || null,
        employeeIds: form.type === "selected" ? form.employeeIds : undefined,
      });
      await refetch();
      setShowModal(false);
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function toggleEmployee(id: string) {
    setForm((f) => ({
      ...f,
      employeeIds: f.employeeIds.includes(id) ? f.employeeIds.filter((x) => x !== id) : [...f.employeeIds, id],
    }));
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorMsg message={error} />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Employee Groups"
        subtitle="Define groups for targeted training assignment"
        action={<Btn onClick={openAdd}><PlusIcon size={14} /> New Group</Btn>}
      />

      <div className="grid gap-4">
        {(groups ?? []).length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
            <Empty message="No groups yet. Create your first group." action={<Btn onClick={openAdd}><PlusIcon size={14} /> New Group</Btn>} />
          </div>
        ) : (
          (groups ?? []).map((g) => {
            const isOpen = expanded === g.id;
            return (
              <div key={g.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/60 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : g.id)}
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <UsersIcon size={16} className="text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900 text-sm">{g.name}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${groupTypeCls[g.type] ?? ""}`}>
                        {groupTypeLabel[g.type] ?? g.type}
                      </span>
                    </div>
                    {g.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{g.description}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-display font-semibold text-slate-800">{g.member_count ?? 0}</p>
                    <p className="text-xs text-slate-400">members</p>
                  </div>
                  <span className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
                </div>
                {isOpen && (
                  <div className="border-t border-slate-100">
                    <GroupMembersPanel groupId={g.id} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <Modal title="Create Employee Group" onClose={() => setShowModal(false)} width="max-w-2xl">
          <div className="space-y-5">
            {formError && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</div>}
            <Field label="Group Name" required>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Q4 Compliance Team" autoFocus />
            </Field>
            <Field label="Description">
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
            </Field>
            <Field label="Group Type" required>
              <div className="flex gap-4">
                {(["all", "department", "selected"] as const).map((t) => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio" name="groupType" value={t} checked={form.type === t}
                      onChange={() => setForm((f) => ({ ...f, type: t, department: "", employeeIds: [] }))}
                      className="accent-indigo-600"
                    />
                    <span className={`text-sm font-medium ${form.type === t ? "text-indigo-700" : "text-slate-600"}`}>
                      {groupTypeLabel[t]}
                    </span>
                  </label>
                ))}
              </div>
            </Field>

            {form.type === "department" && (
              <Field label="Department" required>
                <Select value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}>
                  <option value="">Select department…</option>
                  {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                </Select>
              </Field>
            )}

            {form.type === "selected" && (
              <Field label="Select Employees" required hint={`${form.employeeIds.length} selected`}>
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                  {(employees ?? []).map((e) => {
                    const checked = form.employeeIds.includes(e.id);
                    return (
                      <label
                        key={e.id}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors border-b border-slate-50 last:border-0 ${checked ? "bg-indigo-50/60" : "hover:bg-slate-50"}`}
                      >
                        <input type="checkbox" checked={checked} onChange={() => toggleEmployee(e.id)} className="accent-indigo-600" />
                        <div>
                          <p className="text-sm font-medium text-slate-800">{e.name}</p>
                          <p className="text-xs text-slate-400">{e.department} · {e.role}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </Field>
            )}

            {form.type === "all" && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-500">
                This group will include all <strong className="text-slate-700">{(employees ?? []).length}</strong> active employees.
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Btn>
              <Btn onClick={handleSubmit} disabled={saving}>
                {saving ? "Creating…" : <><UsersIcon size={14} /> Create Group</>}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
