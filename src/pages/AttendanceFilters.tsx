import { useState, useMemo, useEffect } from "react";
import { useQuery } from "../hooks/useQuery";
import { fetchSchedules, fetchAttendanceForFilters, type AttendanceFilterRow } from "../lib/db";
import {
  PageHeader, CompletionBadge, ScheduleBadge, Table, TR, TD, Empty, StatCard,
} from "../components/UI";
import { Spinner, ErrorMsg } from "../components/Status";
import { FilterIcon, CheckIcon, AlertIcon, UsersIcon, SearchIcon } from "../components/Icons";

type AttFilter = "all" | "present" | "absent" | "not-marked";

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function statusLabel(s: string) {
  return s === "in-progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1);
}

function AttBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    present:      "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
    absent:       "bg-red-50 text-red-600 ring-red-200/60",
    "not-marked": "bg-slate-100 text-slate-500 ring-slate-200",
  };
  const labels: Record<string, string> = {
    present: "Present", absent: "Absent", "not-marked": "Not Marked",
  };
  const dot: Record<string, string> = {
    present: "bg-emerald-500", absent: "bg-red-400", "not-marked": "bg-slate-300",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ${cfg[status] ?? cfg["not-marked"]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[status] ?? dot["not-marked"]}`} />
      {labels[status] ?? status}
    </span>
  );
}

export default function AttendanceFilters() {
  const { data: schedules, loading: sl, error: se } = useQuery(fetchSchedules);
  const [selectedTrainingId, setSelectedTrainingId] = useState("");
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [records, setRecords] = useState<AttendanceFilterRow[]>([]);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [attFilter, setAttFilter] = useState<AttFilter>("all");
  const [search, setSearch] = useState("");

  const allSchedules = schedules ?? [];

  // Unique trainings from schedules
  const trainings = useMemo(() => {
    const map = new Map<string, string>();
    allSchedules.forEach((s) => {
      if (s.training) map.set(s.training.id, s.training.name);
    });
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allSchedules]);

  // Sessions for selected training
  const sessions = useMemo(() => {
    if (!selectedTrainingId) return [];
    return allSchedules
      .filter((s) => s.training_id === selectedTrainingId)
      .sort((a, b) => b.session_date.localeCompare(a.session_date));
  }, [allSchedules, selectedTrainingId]);

  // Reset schedule when training changes
  useEffect(() => {
    setSelectedScheduleId("");
    setRecords([]);
    setAttFilter("all");
    setSearch("");
  }, [selectedTrainingId]);

  // Load records when schedule selected
  useEffect(() => {
    if (!selectedScheduleId) { setRecords([]); return; }
    setRecLoading(true);
    setRecError(null);
    fetchAttendanceForFilters(selectedScheduleId)
      .then(setRecords)
      .catch((e) => setRecError(e.message))
      .finally(() => setRecLoading(false));
  }, [selectedScheduleId]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (attFilter !== "all" && r.attendance !== attFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return r.employeeName.toLowerCase().includes(q) || r.employeeCode.toLowerCase().includes(q) || r.department.toLowerCase().includes(q);
      }
      return true;
    });
  }, [records, attFilter, search]);

  const presentCount    = records.filter((r) => r.attendance === "present").length;
  const absentCount     = records.filter((r) => r.attendance === "absent").length;
  const notMarkedCount  = records.filter((r) => r.attendance === "not-marked").length;
  const selectedSession = allSchedules.find((s) => s.id === selectedScheduleId);

  if (sl) return <Spinner />;
  if (se) return <ErrorMsg message={se} />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Attendance Filters"
        subtitle="Filter and view Present / Absent status per training session"
      />

      {/* Selectors */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mb-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Training Program
          </label>
          <select
            className="w-full max-w-xl rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={selectedTrainingId}
            onChange={(e) => setSelectedTrainingId(e.target.value)}
          >
            <option value="">— Select a training program —</option>
            {trainings.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {selectedTrainingId && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Training Session
            </label>
            <select
              className="w-full max-w-xl rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={selectedScheduleId}
              onChange={(e) => setSelectedScheduleId(e.target.value)}
            >
              <option value="">— Select a session —</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {fmtDate(s.session_date)} · {s.employee_group?.name ?? "?"} · {statusLabel(s.status)}
                </option>
              ))}
            </select>
            {sessions.length === 0 && <p className="text-xs text-slate-400 mt-1">No sessions found for this training.</p>}
          </div>
        )}
      </div>

      {!selectedScheduleId && <Empty message="Select a training program and session above to view attendance." />}

      {selectedScheduleId && (
        <div className="animate-fade-in space-y-5">
          {/* Session Info */}
          {selectedSession && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Training</p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">{selectedSession.training?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Group</p>
                  <p className="text-sm font-medium text-slate-700 mt-0.5">{selectedSession.employee_group?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Date</p>
                  <p className="text-sm font-mono-data text-slate-700 mt-0.5">{fmtDate(selectedSession.session_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Session Status</p>
                  <div className="mt-0.5"><ScheduleBadge status={selectedSession.status as any} /></div>
                </div>
              </div>
            </div>
          )}

          {recLoading && <Spinner message="Loading attendance records..." />}
          {recError   && <ErrorMsg message={recError} />}

          {!recLoading && !recError && records.length > 0 && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total"     value={records.length} accent="bg-indigo-50 text-indigo-600"   icon={<UsersIcon size={18} />} />
                <StatCard label="Present"   value={presentCount}   accent="bg-emerald-50 text-emerald-600" icon={<CheckIcon size={18} />} />
                <StatCard label="Absent"    value={absentCount}    accent="bg-red-50 text-red-500"         icon={<AlertIcon size={18} />} />
                <StatCard label="Not Marked" value={notMarkedCount} accent="bg-slate-100 text-slate-500"   icon={<FilterIcon size={18} />} />
              </div>

              {/* Progress bar */}
              {records.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span>{presentCount} present · {absentCount} absent · {notMarkedCount} not marked</span>
                    <span>{records.length} total</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(presentCount / Math.max(records.length, 1)) * 100}%` }} />
                    <div className="bg-red-400 h-full transition-all" style={{ width: `${(absentCount / Math.max(records.length, 1)) * 100}%` }} />
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <SearchIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 w-52"
                    placeholder="Search employee name or ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex gap-1">
                  {(["all", "present", "absent", "not-marked"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setAttFilter(f)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize ${attFilter === f ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
                    >
                      {f === "all" ? "All" : f === "not-marked" ? "Not Marked" : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-slate-400 ml-auto">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
              </div>

              {/* Table */}
              {filtered.length === 0 ? (
                <Empty message="No records match the selected filter." />
              ) : (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
                  <Table headers={["Employee", "Dept.", "Role", "Training", "Session Date", "Attendance", "Completion"]}>
                    {filtered.map((r) => (
                      <TR key={r.recordId}>
                        <TD>
                          <div>
                            <p className="font-medium text-slate-900 text-sm">{r.employeeName}</p>
                            <p className="font-mono-data text-xs text-slate-400">{r.employeeCode}</p>
                          </div>
                        </TD>
                        <TD>{r.department}</TD>
                        <TD>{r.role}</TD>
                        <TD><span className="font-medium text-slate-800 text-sm">{r.trainingName}</span></TD>
                        <TD mono>{fmtDate(r.scheduleDate)}</TD>
                        <TD><AttBadge status={r.attendance} /></TD>
                        <TD><CompletionBadge status={r.completionStatus as any} /></TD>
                      </TR>
                    ))}
                  </Table>
                </div>
              )}
            </>
          )}

          {!recLoading && !recError && records.length === 0 && (
            <Empty message="No attendance records found for this session." />
          )}
        </div>
      )}
    </div>
  );
}
