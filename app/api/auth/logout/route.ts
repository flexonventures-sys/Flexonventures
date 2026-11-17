import { cookies } from "next/headers";
import { ok, route } from "@/lib/http";
import { userClient } from "@/lib/supabase";
import { REF_COOKIE } from "@/lib/session";

export const POST = route(async () => {
  await (await userClient()).auth.signOut();
  (await cookies()).delete(REF_COOKIE);
  return ok();
});
