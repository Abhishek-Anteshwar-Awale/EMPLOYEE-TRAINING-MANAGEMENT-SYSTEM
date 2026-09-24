import { useState } from "react";
import { useQuery } from "../hooks/useQuery";
import { fetchTrainings, createTraining, updateTraining, type DbTraining } from "../lib/db";
import { useAuth, getUserName } from "../context";
import {
  Modal, PageHeader, Btn, Field, Input, Select, Textarea,
  TrainingStatusBadge, Table, TR, TD, Empty,
} from "../components/UI";
import { Spinner, ErrorMsg, Success } from "../components/Status";
import { PlusIcon, EditIcon, SearchIcon } from "../components/Icons";

const FREQUENCIES = ["Quarterly", "Annual", "Monthly", "As Required", "One-time"];

interface FormState {
  name: string;
  frequency: string;
  description: string;
  status: string;
}

const blank: FormState = { name: "", frequency: "Quarterly", description: "", status: "active" };

export default function TrainingMaster() {
  const { user } = useAuth();
  const { data: trainings, loading, error, refetch } = useQuery(fetchTrainings);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<DbTraining | null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  const visible = (trainings ?? []).filter((t) =>
    !search ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.frequency.toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() {
    setEditing(null);
    setForm(blank);
    setFormError("");
    setSuccess("");
    setShowModal(true);
  }

  function openEdit(t: DbTraining) {
    setEditing(t);
    setForm({ name: t.name, frequency: t.frequency, description: t.description, status: t.status });
    setFormError("");
    setSuccess("");
    setShowModal(true);
  }

  async function handleSubmit() {
    if (!form.name.trim()) { setFormError("Training name is required."); return; }
    if (!form.description.trim()) { setFormError("Description is required."); return; }
    setSaving(true);
    setFormError("");
    try {
      if (editing) {
        await updateTraining(editing.id, { name: form.name, frequency: form.frequency, description: form.description, status: form.status });
        setSuccess("Training updated successfully.");
      } else {
        await createTraining({ name: form.name, frequency: form.frequency, description: form.description, created_by: getUserName(user) });
        setSuccess("Training added successfully.");
      }
      await refetch();
      setShowModal(false);
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(t: DbTraining) {
    try {
      await updateTraining(t.id, { status: t.status === "active" ? "inactive" : "active" });
      refetch();
    } catch (e: any) {
      alert(e.message);
    }
  }

  const set = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  if (loading) return <Spinner />;
  if (error) return <ErrorMsg message={error} />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Training Master"
        subtitle="Define and manage all training programs"
        action={<Btn onClick={openAdd}><PlusIcon size={14} /> Add Training</Btn>}
      />

      <div className="relative mb-4 max-w-sm">
        <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
          placeholder="Search trainings…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
        {visible.length === 0 ? (
          <Empty
            message={search ? "No trainings match your search." : "No trainings yet. Add the first one."}
            action={!search ? <Btn onClick={openAdd}><PlusIcon size={14} /> Add Training</Btn> : undefined}
          />
        ) : (
          <Table headers={["Code", "Training Name", "Frequency", "Description", "Status", "Created", ""]}>
            {visible.map((t) => (
              <TR key={t.id}>
                <TD mono>{t.code}</TD>
                <TD><span className="font-medium text-slate-900">{t.name}</span></TD>
                <TD>
                  <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {t.frequency}
                  </span>
                </TD>
                <TD>
                  <span className="text-slate-500 text-xs line-clamp-2 max-w-xs">{t.description}</span>
                </TD>
                <TD>
                  <button onClick={() => toggleStatus(t)} className="focus:outline-none">
                    <TrainingStatusBadge status={t.status as any} />
                  </button>
                </TD>
                <TD mono>{new Date(t.created_at).toLocaleDateString("en-GB")}</TD>
                <TD>
                  <Btn variant="ghost" size="sm" onClick={() => openEdit(t)}>
                    <EditIcon size={13} /> Edit
                  </Btn>
                </TD>
              </TR>
            ))}
          </Table>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-3">
        {visible.length} of {(trainings ?? []).length} training{(trainings ?? []).length !== 1 ? "s" : ""}
      </p>

      {showModal && (
        <Modal title={editing ? "Edit Training" : "Add New Training"} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            {formError && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</div>}
            {success && <Success message={success} />}
            <Field label="Training Name" required>
              <Input value={form.name} onChange={set("name")} placeholder="e.g. AI Awareness Training" autoFocus />
            </Field>
            <Field label="Frequency" required>
              <Select value={form.frequency} onChange={set("frequency")}>
                {FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
              </Select>
            </Field>
            <Field label="Description" required>
              <Textarea value={form.description} onChange={set("description")} placeholder="Brief description of training objectives…" />
            </Field>
            {editing && (
              <Field label="Status">
                <Select value={form.status} onChange={set("status")}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </Field>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Btn>
              <Btn onClick={handleSubmit} disabled={saving}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Training"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
