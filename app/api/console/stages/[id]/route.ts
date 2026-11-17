// Console: run a stage.
// POST { action: "generate" }                       build the draw / pools / first round
// POST { action: "next" }                           next round (Swiss, King of the Court, Shootout, mixers, team knockout)
// POST { action: "challenge", challenger, defender } ladder challenge
import { z } from "zod";
import { body, ok, route } from "@/lib/http";
import { audit, requireStaff } from "@/lib/session";
import { generateStage, ladderChallenge, nextRound } from "@/lib/formats/engine";

const In = z.discriminatedUnion("action", [
  z.object({ action: z.literal("generate") }),
  z.object({ action: z.literal("next") }),
  z.object({ action: z.literal("challenge"), challenger: z.string().uuid(), defender: z.string().uuid() }),
]);

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const staff = await requireStaff();
  const id = (await ctx.params).id;
  const i = await body(req, In);
  const res = i.action === "generate" ? await generateStage(id) : i.action === "next" ? await nextRound(id) : await ladderChallenge(id, i.challenger, i.defender);
  await audit(staff.profileId, "stage." + i.action, "stage", id, res);
  return ok(res);
});
