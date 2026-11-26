import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * 한평생오피스 DB(Supabase) — 서버 전용 service role. 브라우저로 보내지 않는다.
 * env: NEXT_PUBLIC_SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY (바로소셜과 같은 값)
 */
let instance: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (!instance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase env 미설정 (NEXT_PUBLIC_SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY)");
    instance = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return instance;
}
