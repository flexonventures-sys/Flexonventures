import { ok, route } from "@/lib/http";
import { userClient } from "@/lib/supabase";

export const POST = route(async () => {
  await (await userClient()).auth.signOut();
  return ok();
});
