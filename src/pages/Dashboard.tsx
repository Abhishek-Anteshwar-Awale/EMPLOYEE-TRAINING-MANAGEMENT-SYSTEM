import { useQuery } from "../hooks/useQuery";
import { fetchDashboardStats, fetchSchedules } from "../lib/db";
import {
  StatCard, Table, TR, TD, ScheduleBadge, PageHeader,
} from "../components/UI";
import {
  BookIcon, CalendarIcon, UsersIcon, CheckSquareIcon, AlertIcon, ClockIcon, CheckIcon,
} from "../components/Icons";
import { Spinner, ErrorMsg } from "../components/Status";

export default function Dashboard() {
  const { data: stats, loading: sl, error: se } = useQuery(fetchDashboardStats);
  const { data: schedules, loading: scl, error: sce } = useQuery(fetchSchedules);

  const loading = sl || scl;
  const error = se || sce;

  if (loading) return <Spinner />;
  if (error) return <ErrorMsg message={error} />;

  const upcoming = (schedules ?? [])
    .filter((s) => s.status === "upcoming")
    .sort((a, b) => a.session_date.localeCompare(b.session_date))
    .slice(0, 5);

  const recent = (schedules ?? [])
    .filter((s) => s.status === "completed" || s.status === "in-progress")
    .sort((a, b) => b.session_date.localeCompare(a.session_date))
    .slice(0, 5);

  const st = stats!;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Dashboard"
        subtitle={`HR Training Overview · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Trainings" value={st.activeTrainings} sub="definitions" accent="bg-indigo-50 text-indigo-600" icon={<BookIcon />} />
        <StatCard label="Employees" value={st.totalEmployees} sub={`${st.totalGroups} groups`} accent="bg-blue-50 text-blue-600" icon={<UsersIcon />} />
        <StatCard label="Upcoming" value={st.upcomingSchedules} sub="scheduled sessions" accent="bg-violet-50 text-violet-600" icon={<CalendarIcon />} />
        <StatCard label="Overdue" value={st.overdue} sub="attendance records" accent="bg-red-50 text-red-500" icon={<AlertIcon />} />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 text-center">
          <p className="text-3xl font-display font-bold text-emerald-600">{st.completed}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">Completed</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 text-center">
          <p className="text-3xl font-display font-bold text-amber-500">{st.pending}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">Pending</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 text-center">
          <p className="text-3xl font-display font-bold text-red-500">{st.overdue}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">Overdue</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <ClockIcon size={16} className="text-indigo-500" />
            <h3 className="font-semibold text-slate-800 text-sm">Upcoming Sessions</h3>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No upcoming sessions scheduled</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((s) => (
                <div key={s.id} className="flex items-start justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{s.training?.name ?? "—"}</p>
                    <p className="text-xs text-slate-400">{s.employee_group?.name ?? "—"} · {s.trainer}</p>
                  </div>
                  <p className="text-xs font-mono-data text-slate-500 whitespace-nowrap ml-3 mt-0.5">
                    {new Date(s.session_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckSquareIcon size={16} className="text-indigo-500" />
            <h3 className="font-semibold text-slate-800 text-sm">Recent Sessions</h3>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No recent sessions</p>
          ) : (
            <Table headers={["Training", "Date", "Status"]}>
              {recent.map((s) => (
                <TR key={s.id}>
                  <TD>{s.training?.name ?? "—"}</TD>
                  <TD mono>{new Date(s.session_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</TD>
                  <TD><ScheduleBadge status={s.status as any} /></TD>
                </TR>
              ))}
            </Table>
          )}
        </div>
      </div>

      {st.overdue > 0 && (
        <div className="mt-6 bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3">
          <AlertIcon size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              {st.overdue} overdue attendance record{st.overdue > 1 ? "s" : ""} require attention
            </p>
            <p className="text-xs text-red-500 mt-0.5">
              Go to Attendance to mark pending employees, or Reports to see the full breakdown.
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">Overall Attendance Rate</p>
          <p className="text-xs text-slate-400 mt-0.5">Across all tracked training sessions</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${st.attendanceRate}%` }} />
          </div>
          <p className="text-xl font-display font-bold text-slate-900">{st.attendanceRate}%</p>
        </div>
      </div>
    </div>
  );
}
