import { useState, useMemo } from "react";
import { useQuery } from "../hooks/useQuery";
import { fetchReportRows, type ReportRow } from "../lib/db";
import {
  PageHeader, CompletionBadge, Table, TR, TD, StatCard, Empty,
} from "../components/UI";
import { Spinner, ErrorMsg } from "../components/Status";
import { BarChartIcon, CheckIcon, AlertIcon, ClockIcon, SearchIcon, DownloadIcon, FileTextIcon } from "../components/Icons";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type ReportView = "by-session" | "by-training" | "by-employee";
type StatusFilter = "all" | "completed" | "pending" | "overdue";

const DEPTS = ["Engineering", "HR", "Finance", "Operations", "Marketing", "IT", "Legal"];

export default function Reports() {
  const { data: rows, loading, error } = useQuery(fetchReportRows);
  const [view, setView] = useState<ReportView>("by-session");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [search, setSearch] = useState("");

  // All hooks must come before any early return
  const allRows = rows ?? [];

  const filtered = useMemo(() => allRows.filter((r) => {
    if (statusFilter !== "all" && r.completionStatus !== statusFilter) return false;
    if (deptFilter !== "all" && r.department !== deptFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.employeeName.toLowerCase().includes(q) ||
        r.trainingName.toLowerCase().includes(q) ||
        r.trainer.toLowerCase().includes(q) ||
        r.employeeCode.toLowerCase().includes(q) ||
        r.groupName.toLowerCase().includes(q)
      );
    }
    return true;
  }), [allRows, statusFilter, deptFilter, search]);

  const byTraining = useMemo(() => {
    const map = new Map<string, { name: string; completed: number; pending: number; overdue: number; total: number }>();
    allRows.forEach((r) => {
      if (!map.has(r.trainingName)) map.set(r.trainingName, { name: r.trainingName, completed: 0, pending: 0, overdue: 0, total: 0 });
      const e = map.get(r.trainingName)!;
      e.total++;
      (e as any)[r.completionStatus]++;
    });
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [allRows]);

  const byEmployee = useMemo(() => {
    const map = new Map<string, { name: string; dept: string; code: string; completed: number; overdue: number; total: number }>();
    allRows.forEach((r) => {
      if (!map.has(r.employeeId)) map.set(r.employeeId, { name: r.employeeName, dept: r.department, code: r.employeeCode, completed: 0, overdue: 0, total: 0 });
      const e = map.get(r.employeeId)!;
      e.total++;
      if (r.completionStatus === "completed") e.completed++;
      if (r.completionStatus === "overdue") e.overdue++;
    });
    return [...map.values()]
      .filter((e) => deptFilter === "all" || e.dept === deptFilter)
      .filter((e) => !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.code.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.overdue - a.overdue || a.name.localeCompare(b.name));
  }, [allRows, deptFilter, search]);

  if (loading) return <Spinner />;
  if (error) return <ErrorMsg message={error} />;

  const totalCompleted = allRows.filter((r) => r.completionStatus === "completed").length;
  const totalPending   = allRows.filter((r) => r.completionStatus === "pending").length;
  const totalOverdue   = allRows.filter((r) => r.completionStatus === "overdue").length;
  const total = allRows.length;
  const attendanceRate = total > 0 ? Math.round((totalCompleted / total) * 100) : 0;

  // ── Download helpers ────────────────────────────────────────────────────────
  function getExportRows(rows: ReportRow[]) {
    return rows.map((r) => ({
      "Employee Code":  r.employeeCode,
      "Employee Name":  r.employeeName,
      "Department":     r.department,
      "Role":           r.role,
      "Training":       r.trainingName,
      "Session Date":   r.scheduleDate,
      "Trainer":        r.trainer,
      "Group":          r.groupName,
      "Attendance":     r.attendance === "not-marked" ? "Not Marked" : r.attendance.charAt(0).toUpperCase() + r.attendance.slice(1),
      "Completion":     r.completionStatus.charAt(0).toUpperCase() + r.completionStatus.slice(1),
    }));
  }

  function downloadExcel() {
    const rows = view === "by-session" ? getExportRows(filtered)
      : view === "by-employee"
        ? byEmployee.map((e) => ({ "Employee": e.name, "Code": e.code, "Department": e.dept, "Completed": e.completed, "Overdue": e.overdue, "Total": e.total }))
        : byTraining.map((t) => ({ "Training": t.name, "Completed": t.completed, "Pending": t.pending, "Overdue": t.overdue, "Total": t.total }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `trainova-report-${view}-${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  function downloadPDF() {
    const doc = new jsPDF({ orientation: "landscape" });
    const now = new Date().toLocaleString("en-GB");
    const filterDesc = `View: ${view} | Status: ${statusFilter} | Dept: ${deptFilter} | Search: "${search || "—"}"}`;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Trainova — Training Report", 14, 16);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${now}`, 14, 23);
    doc.text(`Filters: View: ${view} | Status: ${statusFilter} | Dept: ${deptFilter}${search ? ` | Search: "${search}"` : ""}`, 14, 29);

    if (view === "by-session") {
      autoTable(doc, {
        startY: 35,
        head: [["Code", "Name", "Dept", "Training", "Date", "Trainer", "Attendance", "Status"]],
        body: filtered.map((r) => [
          r.employeeCode, r.employeeName, r.department, r.trainingName,
          r.scheduleDate, r.trainer,
          r.attendance === "not-marked" ? "Not Marked" : r.attendance,
          r.completionStatus,
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 70, 229] },
      });
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setPage(pageCount);
      doc.setFontSize(8);
      doc.text(`Total: ${filtered.length} records | Completed: ${totalCompleted} | Pending: ${totalPending} | Overdue: ${totalOverdue} | Rate: ${attendanceRate}%`,
        14, (doc as any).internal.pageSize.height - 10);
    } else if (view === "by-employee") {
      autoTable(doc, {
        startY: 35,
        head: [["Code", "Employee", "Department", "Completed", "Overdue", "Total", "Rate %"]],
        body: byEmployee.map((e) => {
          const r = e.total > 0 ? Math.round((e.completed / e.total) * 100) : 0;
          return [e.code, e.name, e.dept, e.completed, e.overdue, e.total, `${r}%`];
        }),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 70, 229] },
      });
    } else {
      autoTable(doc, {
        startY: 35,
        head: [["Training", "Total", "Completed", "Pending", "Overdue", "Rate %"]],
        body: byTraining.map((t) => {
          const r = t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0;
          return [t.name, t.total, t.completed, t.pending, t.overdue, `${r}%`];
        }),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 70, 229] },
      });
    }
    doc.save(`trainova-report-${view}-${new Date().toISOString().slice(0,10)}.pdf`);
  }

  const VIEWS: { id: ReportView; label: string }[] = [
    { id: "by-session", label: "By Session" },
    { id: "by-training", label: "By Training" },
    { id: "by-employee", label: "By Employee" },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Reports"
        subtitle="Live training completion and attendance analytics"
        action={
          <div className="flex gap-2">
            <button
              onClick={downloadExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all"
            >
              <DownloadIcon size={13} /> Excel
            </button>
            <button
              onClick={downloadPDF}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all"
            >
              <FileTextIcon size={13} /> PDF
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Completed" value={totalCompleted} accent="bg-emerald-50 text-emerald-600" icon={<CheckIcon />} />
        <StatCard label="Pending"   value={totalPending}   accent="bg-amber-50 text-amber-500"   icon={<ClockIcon />} />
        <StatCard label="Overdue"   value={totalOverdue}   accent="bg-red-50 text-red-500"       icon={<AlertIcon />} />
        <StatCard label="Attendance Rate" value={`${attendanceRate}%`} accent="bg-indigo-50 text-indigo-600" icon={<BarChartIcon />} />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {VIEWS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {view !== "by-training" && (
          <div className="relative">
            <SearchIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 w-48"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        {view === "by-session" && (
          <div className="flex gap-1">
            {(["all", "completed", "pending", "overdue"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize
                  ${statusFilter === s ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        )}

        {view === "by-employee" && (
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="border border-slate-200 bg-white rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Departments</option>
            {DEPTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
        {view === "by-session" && (
          filtered.length === 0 ? <Empty message="No records match your filters." /> : (
            <Table headers={["Employee", "Dept.", "Training", "Date", "Trainer", "Attendance", "Status"]}>
              {filtered.map((r, i) => (
                <TR key={`${r.scheduleId}-${r.employeeId}-${i}`}>
                  <TD>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{r.employeeName}</p>
                      <p className="font-mono-data text-xs text-slate-400">{r.employeeCode}</p>
                    </div>
                  </TD>
                  <TD>{r.department}</TD>
                  <TD><span className="font-medium text-slate-800 text-sm">{r.trainingName}</span></TD>
                  <TD mono>{new Date(r.scheduleDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</TD>
                  <TD>{r.trainer}</TD>
                  <TD>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium
                      ${r.attendance === "present" ? "text-emerald-600" : r.attendance === "absent" ? "text-red-500" : "text-slate-400"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full inline-block
                        ${r.attendance === "present" ? "bg-emerald-500" : r.attendance === "absent" ? "bg-red-400" : "bg-slate-300"}`} />
                      {r.attendance === "not-marked" ? "Not Marked" : r.attendance.charAt(0).toUpperCase() + r.attendance.slice(1)}
                    </span>
                  </TD>
                  <TD><CompletionBadge status={r.completionStatus as any} /></TD>
                </TR>
              ))}
            </Table>
          )
        )}

        {view === "by-training" && (
          byTraining.length === 0 ? <Empty message="No training data." /> : (
            <Table headers={["Training", "Total", "Completed", "Pending", "Overdue", "Rate"]}>
              {byTraining.map((t) => {
                const rate = t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0;
                return (
                  <TR key={t.name}>
                    <TD><span className="font-semibold text-slate-900">{t.name}</span></TD>
                    <TD mono>{t.total}</TD>
                    <TD><span className="text-emerald-600 font-mono-data font-medium">{t.completed}</span></TD>
                    <TD><span className="text-amber-500 font-mono-data font-medium">{t.pending}</span></TD>
                    <TD><span className="text-red-500 font-mono-data font-medium">{t.overdue}</span></TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${rate}%` }} />
                        </div>
                        <span className="font-mono-data text-xs text-slate-600">{rate}%</span>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </Table>
          )
        )}

        {view === "by-employee" && (
          byEmployee.length === 0 ? <Empty message="No employee data." /> : (
            <Table headers={["Employee", "Dept.", "Completed", "Overdue", "Total", "Rate"]}>
              {byEmployee.map((e) => {
                const rate = e.total > 0 ? Math.round((e.completed / e.total) * 100) : 0;
                return (
                  <TR key={e.code}>
                    <TD>
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{e.name}</p>
                        <p className="font-mono-data text-xs text-slate-400">{e.code}</p>
                      </div>
                    </TD>
                    <TD>{e.dept}</TD>
                    <TD><span className="text-emerald-600 font-mono-data font-medium">{e.completed}</span></TD>
                    <TD><span className={`font-mono-data font-medium ${e.overdue > 0 ? "text-red-500" : "text-slate-400"}`}>{e.overdue}</span></TD>
                    <TD mono>{e.total}</TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${rate === 100 ? "bg-emerald-500" : rate >= 70 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${rate}%` }} />
                        </div>
                        <span className="font-mono-data text-xs text-slate-600">{rate}%</span>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </Table>
          )
        )}
      </div>

      <p className="text-xs text-slate-400 mt-3">
        {view === "by-session" && `${filtered.length} record${filtered.length !== 1 ? "s" : ""} — live from Supabase`}
        {view === "by-training" && `${byTraining.length} training${byTraining.length !== 1 ? "s" : ""}`}
        {view === "by-employee" && `${byEmployee.length} employee${byEmployee.length !== 1 ? "s" : ""}`}
      </p>
    </div>
  );
}
