import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const dbConfigured = () => Boolean(url && anon && service);

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

let admin: SupabaseClient | null = null;
/** Service-role client. Bypasses RLS: only use after the route has checked who is calling. */
export function db(): SupabaseClient {
  if (!dbConfigured()) throw new HttpError(503, "Database is not configured");
  admin ??= createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

/** Per-request client bound to the caller's Supabase Auth cookies (RLS applies). */
export async function userClient(): Promise<SupabaseClient> {
  const store = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => list.forEach(({ name, value, options }) => store.set(name, value, options)),
    },
  });
}
