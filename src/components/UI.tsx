import React from "react";
import { XIcon } from "./Icons";
import type { CompletionStatus, ScheduleStatus, TrainingStatus } from "../types";

// ── Modal ─────────────────────────────────────────────────────────────────────
interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}
export function Modal({ title, onClose, children, width = "max-w-xl" }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className={`relative bg-white rounded-xl shadow-2xl w-full ${width} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-display text-lg font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100"
          >
            <XIcon size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Completion Badge ──────────────────────────────────────────────────────────
const completionCfg: Record<CompletionStatus, { label: string; cls: string }> = {
  completed: { label: "Completed", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200/60 ring-1" },
  pending:   { label: "Pending",   cls: "bg-amber-50 text-amber-700 ring-amber-200/60 ring-1" },
  overdue:   { label: "Overdue",   cls: "bg-red-50 text-red-700 ring-red-200/60 ring-1" },
};
export function CompletionBadge({ status }: { status: CompletionStatus }) {
  const { label, cls } = completionCfg[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ── Schedule Status Badge ─────────────────────────────────────────────────────
const scheduleCfg: Record<ScheduleStatus, { label: string; cls: string }> = {
  upcoming:    { label: "Upcoming",    cls: "bg-blue-50 text-blue-700 ring-blue-200/60 ring-1" },
  "in-progress": { label: "In Progress", cls: "bg-violet-50 text-violet-700 ring-violet-200/60 ring-1" },
  completed:   { label: "Completed",   cls: "bg-emerald-50 text-emerald-700 ring-emerald-200/60 ring-1" },
  cancelled:   { label: "Cancelled",   cls: "bg-slate-100 text-slate-500 ring-slate-200/60 ring-1" },
};
export function ScheduleBadge({ status }: { status: ScheduleStatus }) {
  const { label, cls } = scheduleCfg[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ── Training Status Badge ─────────────────────────────────────────────────────
export function TrainingStatusBadge({ status }: { status: TrainingStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
      ${status === "active"
        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60"
        : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
      }`}
    >
      {status === "active" ? "Active" : "Inactive"}
    </span>
  );
}

// ── Attendance Dot ────────────────────────────────────────────────────────────
export function AttendanceDot({ status }: { status: "present" | "absent" | "not-marked" }) {
  const cfg = {
    "present":    "bg-emerald-500",
    "absent":     "bg-red-400",
    "not-marked": "bg-slate-200",
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${cfg[status]}`} />;
}

// ── Button ────────────────────────────────────────────────────────────────────
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}
export function Btn({ variant = "primary", size = "md", className = "", children, ...rest }: BtnProps) {
  const base = "inline-flex items-center gap-1.5 font-medium rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";
  const sz = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  const v = {
    primary:   "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus-visible:ring-slate-400",
    ghost:     "text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-400",
    danger:    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
  }[variant];
  return (
    <button className={`${base} ${sz} ${v} ${className}`} {...rest}>
      {children}
    </button>
  );
}

// ── Form Field ────────────────────────────────────────────────────────────────
interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}
export function Field({ label, required, children, hint }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

// ── Input / Select / Textarea ─────────────────────────────────────────────────
const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputCls} {...props} />;
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={inputCls} {...props} />;
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputCls} resize-none`} rows={3} {...props} />;
}

// ── Page Header ───────────────────────────────────────────────────────────────
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}
export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  icon?: React.ReactNode;
}
export function StatCard({ label, value, sub, accent = "bg-indigo-50 text-indigo-600", icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex items-start gap-4">
      {icon && (
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${accent}`}>
          {icon}
        </div>
      )}
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-display font-semibold text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function Empty({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-2xl">
        ○
      </div>
      <p className="text-sm text-slate-400 max-w-xs">{message}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────
export function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {headers.map((h) => (
              <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function TR({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <tr
      className={`border-b border-slate-50 ${onClick ? "cursor-pointer hover:bg-slate-50/60 transition-colors" : ""}`}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function TD({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td className={`py-3 px-4 text-slate-700 ${mono ? "font-mono-data text-xs text-slate-500" : ""}`}>
      {children}
    </td>
  );
}
