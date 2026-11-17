// GET /api/formats — the format catalog and scoring presets (public; drives the builder UI)
import { ok } from "@/lib/http";
import { FORMATS, SCORING_PRESETS } from "@/lib/formats/catalog";

export const dynamic = "force-static";

export function GET() {
  return ok({
    formats: FORMATS.map(({ stages, ...f }) => ({ ...f, stagePreview: stages(Object.fromEntries(f.params.map((p) => [p.key, p.default])), { main: SCORING_PRESETS.so11bo1, playoff: SCORING_PRESETS.so11bo3 }).map((s) => s.name) })),
    scoring: SCORING_PRESETS,
  });
}
