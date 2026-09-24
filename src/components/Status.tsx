import { AlertIcon } from "./Icons";

export function Spinner({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}

export function ErrorMsg({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-5 text-sm text-red-700">
      <AlertIcon size={16} className="flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold">Something went wrong</p>
        <p className="mt-0.5 text-red-500">{message}</p>
      </div>
    </div>
  );
}

export function Success({ message }: { message: string }) {
  return (
    <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2.5">
      {message}
    </div>
  );
}
