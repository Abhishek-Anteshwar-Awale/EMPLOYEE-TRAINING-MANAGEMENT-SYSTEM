import { EDGE_BASE, supabase } from "./supabase";

async function edgePost(path: string, body?: object) {
  const session = (await supabase.auth.getSession()).data.session;
  const res = await fetch(`${EDGE_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Edge function error ${res.status}`);
  return json;
}

export async function setupDb() {
  return edgePost("/setup-db");
}

export async function initScheduleAttendance(scheduleId: string) {
  return edgePost("/init-schedule-attendance", { scheduleId });
}
