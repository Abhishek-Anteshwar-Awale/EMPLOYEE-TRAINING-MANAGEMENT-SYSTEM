import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

export const SUPABASE_URL = `https://${projectId}.supabase.co`;
export const EDGE_BASE = `${SUPABASE_URL}/functions/v1/server/make-server-07e462d1`;

export const supabase = createClient(SUPABASE_URL, publicAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
