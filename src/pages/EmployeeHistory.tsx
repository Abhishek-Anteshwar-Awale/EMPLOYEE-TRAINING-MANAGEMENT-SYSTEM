import { useState } from "react";
import { useQuery } from "../hooks/useQuery";
import { fetchAllEmployees, fetchEmployeeHistory, type EmployeeHistoryRow } from "../lib/db";
import {
  PageHeader, CompletionBadge, ScheduleBadge, Table, TR, TD, Empty, StatCard,
} from "../components/UI";
import { Spinner, ErrorMsg } from "../components/Status";
import { EyeIcon, CheckIcon, AlertIcon, ClockIcon } from "../components/Icons";

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function AttBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    present:     "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
    absent:      "bg-red-50 text-red-600 ring-red-200/60",
    "not-marked":"bg-slate-100 text-slate-500 ring-slate-200",
  };
  const labels: Record<string, string> = {
    present: "Present", absent: "Absent", "not-marked": "Not Marked",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ${cfg[status] ?? cfg["not-marked"]}`}>
      {labels[status] ?? status}
    </span>
  );
}

export default function EmployeeHistory() {
  const { data: employees, loading: el, error: ee } = useQuery(fetchAllEmployees);
  const [selectedId, setSelectedId] = useState("");
  const [history, setHistory] = useState<EmployeeHistoryRow[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histError, setHistError] = useState<string | null>(null);
  const [attFilter, setAttFilter] = useState<"all" | "present" | "absent" | "not-marked">("all");

  const selectedEmp = (employees ?? []).find((e) => e.id === selectedId);

  async function handleSelect(id: string) {
    setSelectedId(id);
    setAttFilter("all");
    if (!id) { setHistory([]); return; }
    setHistLoading(true);
    setHistError(null);
    try {
      const rows = await fetchEmployeeHistory(id);
      setHistory(rows);
    } catch (e: any) {
      setHistError(e.message);
    } finally {
      setHistLoading(false);
    }
  }

  const filtered = history.filter((r) => attFilter === "all" || r.attendance === attFilter);

  const presentCount    = history.filter((r) => r.attendance === "present").length;
  const absentCount     = history.filter((r) => r.attendance === "absent").length;
  const completedCount  = history.filter((r) => r.completionStatus === "completed").length;
  const overdueCount    = history.filter((r) => r.completionStatus === "overdue").length;

  if (el) return <Spinner />;
  if (ee) return <ErrorMsg message={ee} />;

  const allEmps = employees ?? [];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Employee History"
        subtitle="View complete training and attendance history for any employee"
      />

      {/* Employee Selector */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mb-6">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Select Employee
        </label>
        <select
          className="w-full max-w-xl rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={selectedId}
          onChange={(e) => handleSelect(e.target.value)}
        >
          <option value="">— Choose an employee to view their history —</option>
          {allEmps.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} ({e.employee_code}) — {e.department}{e.status === "inactive" ? " [Inactive]" : ""}
            </option>
          ))}
        </select>
      </div>

      {!selectedId && <Empty message="Select an employee above to view their full training history." />}

      {selectedId && selectedEmp && (
        <div className="animate-fade-in space-y-6">
          {/* Employee Profile Card */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <EyeIcon size={20} className="text-indigo-500" />
              </div>
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Employee</p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">{selectedEmp.name}</p>
                  <p className="text-xs font-mono-data text-slate-400">{selectedEmp.employee_code}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Department</p>
                  <p className="text-sm font-medium text-slate-700 mt-0.5">{selectedEmp.department}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Role</p>
                  <p className="text-sm font-medium text-slate-700 mt-0.5">{selectedEmp.role}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Status</p>
                  <span className={`inline-flex items-center gap-1.5 mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ${selectedEmp.status === "active" ? "bg-emerald-50 text-emerald-700 ring-emerald-200/60" : "bg-slate-100 text-slate-500 ring-slate-200"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${selectedEmp.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />
                    {selectedEmp.status === "active" ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {histLoading && <Spinner message="Loading training history..." />}
          {histError  && <ErrorMsg message={histError} />}

          {!histLoading && !histError && (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Sessions"  value={history.length}  accent="bg-indigo-50 text-indigo-600"   icon={<ClockIcon size={18} />} />
                <StatCard label="Present"         value={presentCount}    accent="bg-emerald-50 text-emerald-600" icon={<CheckIcon size={18} />} />
                <StatCard label="Absent"          value={absentCount}     accent="bg-red-50 text-red-500"         icon={<AlertIcon size={18} />} />
                <StatCard label="Completed"       value={completedCount}  accent="bg-violet-50 text-violet-600"   icon={<CheckIcon size={18} />} />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Filter by attendance:</span>
                {(["all", "present", "absent", "not-marked"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setAttFilter(f)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize ${attFilter === f ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
                  >
                    {f === "all" ? "All" : f === "not-marked" ? "Not Marked" : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
                <span className="text-xs text-slate-400 ml-auto">{filtered.length} session{filtered.length !== 1 ? "s" : ""}</span>
              </div>

              {/* History Table */}
              {history.length === 0 ? (
                <Empty message="No training history found for this employee." />
              ) : filtered.length === 0 ? (
                <Empty message="No records match the selected filter." />
              ) : (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
                  <Table headers={["Training", "Date", "Group", "Trainer", "Session Status", "Attendance", "Completion"]}>
                    {filtered.map((row, i) => (
                      <TR key={`${row.scheduleId}-${i}`}>
                        <TD>
                          <div>
                            <p className="font-medium text-slate-900 text-sm">{row.trainingName}</p>
                            <p className="font-mono-data text-xs text-slate-400">{row.trainingCode}</p>
                          </div>
                        </TD>
                        <TD mono>{fmtDate(row.scheduleDate)}</TD>
                        <TD>{row.groupName}</TD>
                        <TD>{row.trainer}</TD>
                        <TD><ScheduleBadge status={row.scheduleStatus as any} /></TD>
                        <TD><AttBadge status={row.attendance} /></TD>
                        <TD><CompletionBadge status={row.completionStatus as any} /></TD>
                      </TR>
                    ))}
                  </Table>
                </div>
              )}

              {overdueCount > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
                  <AlertIcon size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    <strong>{overdueCount}</strong> overdue session{overdueCount > 1 ? "s" : ""} found in this employee's history.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
