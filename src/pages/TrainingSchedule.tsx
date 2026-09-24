import { useState } from "react";
import { useQuery } from "../hooks/useQuery";
import { fetchSchedules, fetchTrainings, fetchGroups, createSchedule, updateScheduleStatus } from "../lib/db";
import { initAttendanceRecords } from "../lib/db";
import {
  Modal, PageHeader, Btn, Field, Input, Select, Textarea,
  ScheduleBadge, Table, TR, TD, Empty,
} from "../components/UI";
import { Spinner, ErrorMsg } from "../components/Status";
import { PlusIcon, CalendarIcon, SearchIcon } from "../components/Icons";

const FREQUENCIES = ["Quarterly", "Annual", "Monthly", "As Required", "One-time"];
const STATUSES = ["upcoming", "in-progress", "completed", "cancelled"] as const;

function statusLabel(s: string) {
  return s === "in-progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1);
}

export default function TrainingSchedule() {
  const { data: schedules, loading: sl, error: se, refetch } = useQuery(fetchSchedules);
  const { data: trainings, loading: tl } = useQuery(fetchTrainings);
  const { data: groups, loading: gl } = useQuery(fetchGroups);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    trainingId: "", groupId: "", date: "", trainer: "", frequency: "Quarterly", status: "upcoming", notes: "",
  });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const activeTrainings = (trainings ?? []).filter((t) => t.status === "active");

  const visible = (schedules ?? [])
    .filter((s) => filterStatus === "all" || s.status === filterStatus)
    .filter((s) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (s.training?.name ?? "").toLowerCase().includes(q) ||
        (s.employee_group?.name ?? "").toLowerCase().includes(q) ||
        s.trainer.toLowerCase().includes(q)
      );
    });

  function openAdd() {
    const first = activeTrainings[0];
    setForm({
      trainingId: first?.id ?? "",
      groupId: (groups ?? [])[0]?.id ?? "",
      date: "",
      trainer: "",
      frequency: first?.frequency ?? "Quarterly",
      status: "upcoming",
      notes: "",
    });
    setFormError("");
    setShowModal(true);
  }

  function handleTrainingChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const t = trainings?.find((x) => x.id === e.target.value);
    setForm((f) => ({ ...f, trainingId: e.target.value, frequency: t?.frequency ?? f.frequency }));
  }

  async function handleSubmit() {
    if (!form.trainingId) { setFormError("Select a training."); return; }
    if (!form.groupId) { setFormError("Select an employee group."); return; }
    if (!form.date) { setFormError("Date is required."); return; }
    if (!form.trainer.trim()) { setFormError("Trainer name is required."); return; }
    setSaving(true);
    setFormError("");
    try {
      const newSchedule = await createSchedule({
        training_id: form.trainingId,
        group_id: form.groupId,
        session_date: form.date,
        trainer: form.trainer,
        frequency: form.frequency,
        status: form.status,
        notes: form.notes || undefined,
      });
      await initAttendanceRecords(newSchedule.id, form.groupId, form.date);
      await refetch();
      setShowModal(false);
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      await updateScheduleStatus(id, status);
      refetch();
    } catch (e: any) {
      alert(e.message);
    }
  }

  const set = (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  if (sl || tl || gl) return <Spinner />;
  if (se) return <ErrorMsg message={se} />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Training Schedule"
        subtitle="Plan and track all scheduled training sessions"
        action={<Btn onClick={openAdd}><PlusIcon size={14} /> Schedule Training</Btn>}
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 w-56"
            placeholder="Search sessions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {(["all", ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all
                ${filterStatus === s ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
            >
              {s === "all" ? "All" : statusLabel(s)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
        {visible.length === 0 ? (
          <Empty message="No sessions match your filters." action={<Btn onClick={openAdd}><PlusIcon size={14} /> Schedule Training</Btn>} />
        ) : (
          <Table headers={["Training", "Group", "Date", "Trainer", "Frequency", "Status", "Update"]}>
            {visible.map((s) => (
              <TR key={s.id}>
                <TD><span className="font-medium text-slate-900">{s.training?.name ?? "—"}</span></TD>
                <TD>{s.employee_group?.name ?? "—"}</TD>
                <TD mono>{new Date(s.session_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</TD>
                <TD>{s.trainer}</TD>
                <TD>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{s.frequency}</span>
                </TD>
                <TD><ScheduleBadge status={s.status as any} /></TD>
                <TD>
                  <select
                    value={s.status}
                    onChange={(e) => handleStatusChange(s.id, e.target.value)}
                    className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 text-slate-600"
                  >
                    {STATUSES.map((st) => <option key={st} value={st}>{statusLabel(st)}</option>)}
                  </select>
                </TD>
              </TR>
            ))}
          </Table>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-3">{visible.length} session{visible.length !== 1 ? "s" : ""} shown</p>

      {showModal && (
        <Modal title="Schedule a Training" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            {formError && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</div>}
            <Field label="Training" required>
              <Select value={form.trainingId} onChange={handleTrainingChange}>
                <option value="">Select training…</option>
                {activeTrainings.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
            <Field label="Employee Group" required>
              <Select value={form.groupId} onChange={set("groupId")}>
                <option value="">Select group…</option>
                {(groups ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date" required>
                <Input type="date" value={form.date} onChange={set("date")} />
              </Field>
              <Field label="Frequency" required>
                <Select value={form.frequency} onChange={set("frequency")}>
                  {FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Trainer" required>
              <Input value={form.trainer} onChange={set("trainer")} placeholder="e.g. Jennifer Lee" />
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={set("status")}>
                {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
              </Select>
            </Field>
            <Field label="Notes">
              <Textarea value={form.notes} onChange={set("notes")} placeholder="Optional notes…" />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Btn>
              <Btn onClick={handleSubmit} disabled={saving}>
                {saving ? "Scheduling…" : <><CalendarIcon size={14} /> Schedule</>}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
