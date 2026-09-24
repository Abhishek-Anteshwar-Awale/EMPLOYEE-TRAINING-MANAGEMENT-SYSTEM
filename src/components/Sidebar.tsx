import type { Page } from "../types";
import { useAuth, getUserName, getUserRole } from "../context";
import {
  HomeIcon, BookIcon, CalendarIcon, UsersIcon,
  CheckSquareIcon, BarChartIcon, UserIcon, LogoutIcon,
  UserPlusIcon, EyeIcon, FilterIcon,
} from "./Icons";

interface NavItem { page: Page; label: string; icon: React.ReactNode }

const NAV: NavItem[] = [
  { page: "dashboard",         label: "Dashboard",         icon: <HomeIcon /> },
  { page: "training-master",   label: "Training Master",   icon: <BookIcon /> },
  { page: "training-schedule", label: "Training Schedule", icon: <CalendarIcon /> },
  { page: "employee-groups",   label: "Employee Groups",   icon: <UsersIcon /> },
  { page: "attendance",        label: "Attendance",        icon: <CheckSquareIcon /> },
  { page: "reports",           label: "Reports",           icon: <BarChartIcon /> },
];

const HR_NAV: NavItem[] = [
  { page: "employee-list",      label: "Employee List",    icon: <UserPlusIcon /> },
  { page: "employee-history",   label: "Emp. History",     icon: <EyeIcon /> },
  { page: "attendance-filters", label: "Att. Filters",     icon: <FilterIcon /> },
];

interface SidebarProps { current: Page; onNavigate: (p: Page) => void }

export default function Sidebar({ current, onNavigate }: SidebarProps) {
  const { user, signOut } = useAuth();
  const name = getUserName(user);
  const role = getUserRole(user);

  return (
    <aside className="w-60 flex-shrink-0 bg-slate-900 flex flex-col h-full">
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-indigo-500 flex items-center justify-center flex-shrink-0">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.5 1.5L1.5 5.5v8h3.5V9h5v4.5H13.5v-8L7.5 1.5z" fill="white" fillOpacity="0.12"/>
              <path d="M1 5.75h13M7.5 1.5v12" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
              <rect x="4.5" y="5.75" width="6" height="1.2" rx="0.6" fill="white"/>
            </svg>
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-tight">Trainova</p>
            <p className="text-slate-500 text-xs">Training Hub</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-slate-600 text-xs font-semibold uppercase tracking-widest px-3 pb-2 pt-1">Modules</p>
        {NAV.map(({ page, label, icon }) => {
          const active = current === page;
          return (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${active ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
            >
              <span className={active ? "text-white" : "text-slate-500"}>{icon}</span>
              {label}
            </button>
          );
        })}

        <p className="text-slate-600 text-xs font-semibold uppercase tracking-widest px-3 pb-2 pt-4">HR Tools</p>
        {HR_NAV.map(({ page, label, icon }) => {
          const active = current === page;
          return (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${active ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
            >
              <span className={active ? "text-white" : "text-slate-500"}>{icon}</span>
              {label}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 px-4 py-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
            <UserIcon size={14} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs font-semibold truncate">{name}</p>
            <p className="text-slate-500 text-xs">{role}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2 text-slate-500 hover:text-red-400 text-xs px-1 py-1.5 rounded transition-colors"
        >
          <LogoutIcon size={13} /> Sign Out
        </button>
      </div>
    </aside>
  );
}
