import { useState, useEffect } from "react";
import { useQuery } from "../hooks/useQuery";
import { fetchSchedules, fetchAttendanceForSchedule, markAttendance, type DbAttendance } from "../lib/db";
import { useAuth, getUserName } from "../context";
import {
  PageHeader, Btn, CompletionBadge, ScheduleBadge, Table, TR, TD, Empty,
} from "../components/UI";
import { Spinner, ErrorMsg } from "../components/Status";
import { AlertIcon, CheckIcon } from "../components/Icons";

function statusLabel(s: string) {
  return s === "in-progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Attendance() {
  const { user } = useAuth();
  const { data: schedules, loading: sl, error: se } = useQuery(fetchSchedules);
  const [selectedId, setSelectedId] = useState("");
  const [attendance, setAttendance] = useState<DbAttendance[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [attError, setAttError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const eligible = (schedules ?? [])
    .filter((s) => s.status !== "upcoming" && s.status !== "cancelled")
    .sort((a, b) => b.session_date.localeCompare(a.session_date));

  const selected = schedules?.find((s) => s.id === selectedId);

  useEffect(() => {
    if (!selectedId) { setAttendance([]); return; }
    setAttLoading(true);
    setAttError(null);
    fetchAttendanceForSchedule(selectedId)
      .then(setAttendance)
      .catch((e) => setAttError(e.message))
      .finally(() => setAttLoading(false));
  }, [selectedId]);

  async function handleMark(record: DbAttendance, att: string) {
    if (!selected) return;
    setSaved(false);
    try {
      await markAttendance(selected.id, record.employee_id, att, selected.session_date, getUserName(user));
      // Optimistic update
      setAttendance((prev) =>
        prev.map((r) =>
          r.employee_id === record.employee_id
            ? { ...r, attendance: att, completion_status: deriveStatus(att, selected.session_date) }
            : r
        )
      );
      setSaved(true);
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function markAll(att: string) {
    if (!selected) return;
    setSaved(false);
    const markedBy = getUserName(user);
    await Promise.all(attendance.map((r) => markAttendance(selected.id, r.employee_id, att, selected.session_date, markedBy)));
    setAttendance((prev) =>
      prev.map((r) => ({ ...r, attendance: att, completion_status: deriveStatus(att, selected.session_date) }))
    );
    setSaved(true);
  }

  function deriveStatus(att: string, sessionDate: string): string {
    if (att === "present") return "completed";
    return new Date(sessionDate) < new Date() ? "overdue" : "pending";
  }

  const presentCount  = attendance.filter((r) => r.attendance === "present").length;
  const absentCount   = attendance.filter((r) => r.attendance === "absent").length;
  const unmarkedCount = attendance.filter((r) => r.attendance === "not-marked").length;
  const isPast = selected ? new Date(selected.session_date) < new Date() : false;

  if (sl) return <Spinner />;
  if (se) return <ErrorMsg message={se} />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Attendance"
        subtitle="Mark per-employee attendance for conducted training sessions"
      />

      {/* Session Selector */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mb-6">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Select Training Session
        </label>
        <select
          className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={selectedId}
          onChange={(e) => { setSelectedId(e.target.value); setSaved(false); }}
        >
          <option value="">— Choose a session to mark attendance —</option>
          {eligible.map((s) => (
            <option key={s.id} value={s.id}>
              {s.training?.name ?? "?"} · {s.employee_group?.name ?? "?"} ·{" "}
              {new Date(s.session_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              {" "}[{statusLabel(s.status)}]
            </option>
          ))}
        </select>
        {eligible.length === 0 && (
          <p className="text-xs text-slate-400 mt-2">No eligible sessions. Schedule a training with a past or in-progress date first.</p>
        )}
      </div>

      {!selected && <Empty message="Select a training session above to start marking attendance." />}

      {selected && (
        <div className="animate-fade-in">
          {/* Session Info */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mb-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Training</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{selected.training?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Group</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{selected.employee_group?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Date</p>
                <p className="text-sm font-mono-data text-slate-700 mt-0.5">
                  {new Date(selected.session_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Status</p>
                <div className="mt-0.5"><ScheduleBadge status={selected.status as any} /></div>
              </div>
            </div>

            {!attLoading && attendance.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                  <span>{presentCount} present · {absentCount} absent · {unmarkedCount} not marked</span>
                  <span>{attendance.length} total</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                  <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(presentCount / Math.max(attendance.length, 1)) * 100}%` }} />
                  <div className="bg-red-400 h-full transition-all" style={{ width: `${(absentCount / Math.max(attendance.length, 1)) * 100}%` }} />
                </div>
              </div>
            )}
          </div>

          {attLoading && <Spinner message="Loading attendance records…" />}
          {attError && <ErrorMsg message={attError} />}

          {!attLoading && !attError && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-slate-500 font-medium">Bulk mark:</span>
                <Btn variant="secondary" size="sm" onClick={() => markAll("present")}>All Present</Btn>
                <Btn variant="secondary" size="sm" onClick={() => markAll("absent")}>All Absent</Btn>
                {saved && (
                  <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 ml-2">
                    <CheckIcon size={12} /> Saved to Supabase
                  </span>
                )}
              </div>

              {isPast && unmarkedCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-2.5 mb-3">
                  <AlertIcon size={14} className="flex-shrink-0" />
                  {unmarkedCount} employee{unmarkedCount > 1 ? "s" : ""} not marked — session has passed, these will show as <strong>Overdue</strong>.
                </div>
              )}

              {attendance.length === 0 ? (
                <Empty message="No attendance records found for this session. The attendance may not have been initialised yet." />
              ) : (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
                  <Table headers={["Employee", "Dept.", "Role", "Attendance", "Status"]}>
                    {attendance.map((rec) => (
                      <TR key={rec.id}>
                        <TD>
                          <div>
                            <p className="font-medium text-slate-900 text-sm">{rec.employee?.name ?? "—"}</p>
                            <p className="font-mono-data text-xs text-slate-400">{rec.employee?.employee_code ?? ""}</p>
                          </div>
                        </TD>
                        <TD>{rec.employee?.department ?? "—"}</TD>
                        <TD>{rec.employee?.role ?? "—"}</TD>
                        <TD>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleMark(rec, "present")}
                              className={`px-3 py-1 text-xs font-medium rounded-md border transition-all
                                ${rec.attendance === "present" ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-600 border-slate-200 hover:border-emerald-400 hover:text-emerald-600"}`}
                            >
                              Present
                            </button>
                            <button
                              onClick={() => handleMark(rec, "absent")}
                              className={`px-3 py-1 text-xs font-medium rounded-md border transition-all
                                ${rec.attendance === "absent" ? "bg-red-500 text-white border-red-500" : "bg-white text-slate-600 border-slate-200 hover:border-red-400 hover:text-red-600"}`}
                            >
                              Absent
                            </button>
                          </div>
                        </TD>
                        <TD><CompletionBadge status={rec.completion_status as any} /></TD>
                      </TR>
                    ))}
                  </Table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
