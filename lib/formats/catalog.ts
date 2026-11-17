// Pickleball tournament format catalog. Each format declares who enters, the options an organiser
// can set, and the stage pipeline it expands into. The engine (lib/formats/engine.ts) runs stages.
// Sources: USA Pickleball tournament policies, Pickleball.com organiser guides, MLP rules, DUPR, Pickleheads.

export type StageKind =
  | "round_robin" | "single_elim" | "double_elim" | "compass" | "consolation" | "swiss"
  | "king_court" | "shootout" | "rotating" | "americano" | "mexicano" | "ladder" | "team_ties";

export type Scoring = { type: "sideout" | "rally"; to: number; bo: number; winBy?: number; cap?: number; freeze?: number; timed?: number };
export type StageDef = { kind: StageKind; name: string; config: Record<string, unknown>; scoring: Scoring };
export type Param =
  | { key: string; label: string; type: "number"; default: number; min: number; max: number; help?: string }
  | { key: string; label: string; type: "select"; default: string; options: [string, string][]; help?: string }
  | { key: string; label: string; type: "boolean"; default: boolean; help?: string };

export type FormatDef = {
  id: string; name: string;
  family: "Elimination" | "Round robin" | "Pool play + playoffs" | "Progressive" | "Social & rotating" | "Team" | "League";
  participant: "player" | "pair" | "team";          // what one entry is
  allows?: ("player" | "pair")[];                   // formats that accept singles or doubles entries
  scale: string; players: string; summary: string; how: string[];
  params: Param[];
  stages: (c: Record<string, any>, sc: { main: Scoring; playoff: Scoring }) => StageDef[];
  needsOwners?: boolean;
};

export const SCORING_PRESETS: Record<string, Scoring & { label: string }> = {
  so11bo1: { label: "1 game to 11, side-out", type: "sideout", to: 11, bo: 1 },
  so11bo3: { label: "Best of 3 to 11, side-out", type: "sideout", to: 11, bo: 3 },
  so15bo1: { label: "1 game to 15, side-out", type: "sideout", to: 15, bo: 1 },
  so21bo1: { label: "1 game to 21, side-out", type: "sideout", to: 21, bo: 1 },
  so11bo5: { label: "Best of 5 to 11, side-out (pro finals)", type: "sideout", to: 11, bo: 5 },
  r11bo3: { label: "Best of 3 to 11, rally", type: "rally", to: 11, bo: 3 },
  r15bo1: { label: "1 game to 15, rally", type: "rally", to: 15, bo: 1 },
  r21bo1: { label: "1 game to 21, rally", type: "rally", to: 21, bo: 1 },
  r21freeze: { label: "Rally to 21, freeze at 20 (MLP)", type: "rally", to: 21, bo: 1, freeze: 20 },
  r15cap: { label: "Rally to 15, win by 1 at 17 cap", type: "rally", to: 15, bo: 1, cap: 17 },
  americano24: { label: "Americano: rally to 21, win by 1", type: "rally", to: 21, bo: 1, winBy: 1 },
  timed12: { label: "Timed 12 minutes, rally", type: "rally", to: 99, bo: 1, winBy: 1, timed: 12 },
};

const groups: Param = { key: "groups", label: "Pools", type: "number", default: 2, min: 1, max: 32 };
const advance: Param = { key: "advance", label: "Advance per pool", type: "number", default: 2, min: 1, max: 8 };
const bronze: Param = { key: "bronze", label: "Bronze medal match", type: "boolean", default: true };
const rounds = (d: number): Param => ({ key: "rounds", label: "Rounds", type: "number", default: d, min: 1, max: 30 });
const courts: Param = { key: "courts", label: "Courts in use", type: "number", default: 4, min: 1, max: 40 };
export const FORMATS: FormatDef[] = [
  // ---------------- Elimination
  {
    id: "single_elim", name: "Single elimination", family: "Elimination", participant: "pair", allows: ["player", "pair"],
    scale: "Any size, fastest", players: "4 to 256", summary: "Lose once and you are out. Seeds get byes.",
    how: ["Seeded bracket (1 v 16, 8 v 9 ...), top seeds get byes", "Winners advance automatically", "Optional bronze match between semi-final losers"],
    params: [bronze], stages: (c, s) => [{ kind: "single_elim", name: "Main draw", config: { bronze: c.bronze }, scoring: s.playoff }],
  },
  {
    id: "double_elim", name: "Double elimination", family: "Elimination", participant: "pair", allows: ["player", "pair"],
    scale: "Competitive, medium to large", players: "4 to 128", summary: "Lose twice to be out. Losers drop to a back bracket; its winner meets the winners-bracket champion.",
    how: ["Winners bracket and losers (back) bracket", "Each winners-round loser drops into the losers bracket", "Grand final; optional reset if the losers-bracket team wins"],
    params: [{ key: "reset", label: "Grand final reset", type: "boolean", default: false, help: "Second final if the back-draw team wins the first" }],
    stages: (c, s) => [{ kind: "double_elim", name: "Double elimination", config: { reset: c.reset }, scoring: s.playoff }],
  },
  {
    id: "compass", name: "Compass draw", family: "Elimination", participant: "pair", allows: ["player", "pair"],
    scale: "8, 16 or 32, everyone plays the same number of matches", players: "8 to 32", summary: "Losers of every round move into a new direction bracket (East, West, North, South ...).",
    how: ["Everyone starts in East", "Round 1 losers go West, round 2 losers North, West round 1 losers South ...", "Every player plays log2(N) matches; each direction crowns a winner"],
    params: [], stages: (_c, s) => [{ kind: "compass", name: "Compass draw", config: {}, scoring: s.main }],
  },
  {
    id: "consolation", name: "Single elimination with consolation", family: "Elimination", participant: "pair", allows: ["player", "pair"],
    scale: "Any size", players: "8 to 128", summary: "Main draw plus a back draw for first-round losers so everyone plays at least twice.",
    how: ["Seeded main draw", "First-round losers enter a consolation bracket", "Main and consolation champions"],
    params: [], stages: (_c, s) => [{ kind: "consolation", name: "Main and consolation", config: {}, scoring: s.playoff }],
  },
  // ---------------- Round robin
  {
    id: "round_robin", name: "Round robin", family: "Round robin", participant: "pair", allows: ["player", "pair"],
    scale: "Small (4 to 10 per pool)", players: "3 to 40", summary: "Everyone plays everyone in their pool. Best record wins.",
    how: ["Seeds spread across pools by snake order", "Points per win; ties by head to head, games, then points", "Final standings decide placings"],
    params: [{ ...groups, default: 1 }, { key: "double", label: "Play each opponent twice", type: "boolean", default: false }],
    stages: (c, s) => [{ kind: "round_robin", name: c.groups > 1 ? "Pools" : "Round robin", config: { groups: c.groups, double: c.double }, scoring: s.main }],
  },
  {
    id: "pools_single_elim", name: "Pool play, then single elimination", family: "Pool play + playoffs", participant: "pair", allows: ["player", "pair"],
    scale: "Medium to large; USA Pickleball's most common format", players: "8 to 256", summary: "Round-robin pools seed a knockout bracket; group winners meet other pools' runners-up.",
    how: ["Pools by snake seeding", "Top N per pool advance", "Crossover seeding into a single-elimination bracket with optional bronze"],
    params: [groups, advance, bronze],
    stages: (c, s) => [
      { kind: "round_robin", name: "Pool play", config: { groups: c.groups }, scoring: s.main },
      { kind: "single_elim", name: "Playoffs", config: { bronze: c.bronze, fromPools: c.advance }, scoring: s.playoff },
    ],
  },
  {
    id: "pools_double_elim", name: "Pool play, then double elimination", family: "Pool play + playoffs", participant: "pair", allows: ["player", "pair"],
    scale: "Medium to large, competitive", players: "8 to 128", summary: "Pools decide seeding for a double-elimination playoff.",
    how: ["Round-robin pools", "Top N per pool advance", "Double elimination playoff with grand final"],
    params: [groups, advance, { key: "reset", label: "Grand final reset", type: "boolean", default: false }],
    stages: (c, s) => [
      { kind: "round_robin", name: "Pool play", config: { groups: c.groups }, scoring: s.main },
      { kind: "double_elim", name: "Playoffs", config: { reset: c.reset, fromPools: c.advance }, scoring: s.playoff },
    ],
  },
  {
    id: "pools_medal", name: "Pool play, then medal round", family: "Pool play + playoffs", participant: "pair", allows: ["player", "pair"],
    scale: "Small to medium, quick finish", players: "6 to 48", summary: "Pools, then semi-finals, gold and bronze matches for the top four.",
    how: ["Round-robin pools", "Top 4 overall play semi-finals", "Gold and bronze medal matches"],
    params: [groups],
    stages: (c, s) => [
      { kind: "round_robin", name: "Pool play", config: { groups: c.groups }, scoring: s.main },
      { kind: "single_elim", name: "Medal round", config: { bronze: true, topN: 4 }, scoring: s.playoff },
    ],
  },
  {
    id: "rr_double_elim_flights", name: "Skill-flighted double elimination", family: "Pool play + playoffs", participant: "pair", allows: ["pair"],
    scale: "Large club events", players: "16 to 256", summary: "One pool round places teams into Gold and Silver flights, each a double-elimination bracket.",
    how: ["Short round robin to rank teams", "Top half to Gold, rest to Silver", "Double elimination in each flight"],
    params: [groups],
    stages: (c, s) => [
      { kind: "round_robin", name: "Seeding pools", config: { groups: c.groups }, scoring: s.main },
      { kind: "double_elim", name: "Gold flight", config: { flight: "top" }, scoring: s.playoff },
      { kind: "double_elim", name: "Silver flight", config: { flight: "bottom" }, scoring: s.playoff },
    ],
  },
  // ---------------- Progressive
  {
    id: "swiss", name: "Swiss system", family: "Progressive", participant: "pair", allows: ["player", "pair"],
    scale: "Large fields, fixed number of rounds", players: "8 to 512", summary: "Every round pairs teams with the same record, no rematches; no one is knocked out.",
    how: ["Round 1 by seed", "Each later round pairs equal records, avoiding rematches", "Odd numbers: lowest-ranked team without a bye sits out with a win"],
    params: [rounds(5), { key: "topCut", label: "Top cut to playoffs (0 = none)", type: "number", default: 0, min: 0, max: 32 }],
    stages: (c, s) => [
      { kind: "swiss", name: "Swiss rounds", config: { rounds: c.rounds }, scoring: s.main },
      ...(c.topCut ? [{ kind: "single_elim" as const, name: "Top cut", config: { topN: c.topCut, bronze: false }, scoring: s.playoff }] : []),
    ],
  },
  {
    id: "king_court", name: "King / Queen of the Court", family: "Progressive", participant: "pair",
    scale: "Courts x 2 teams", players: "4 to 80", summary: "Fixed pairs. Winners move up a court, losers move down; the top court winner is king.",
    how: ["Court 1 is the top court", "Each round winners move up, losers move down", "Ranking by court wins and points"],
    params: [courts, rounds(8)],
    stages: (c, s) => [{ kind: "king_court", name: "King of the Court", config: { courts: c.courts, rounds: c.rounds }, scoring: s.main }],
  },
  {
    id: "shootout", name: "Shootout / Up & Down the River", family: "Progressive", participant: "player",
    scale: "Individual players, 4 per court", players: "8 to 160", summary: "Winners move up a court and split partners; losers move down. Individual standings.",
    how: ["Players placed on courts by rating", "Winners move up, losers move down, partners split each round", "Individual ranking by wins, then points"],
    params: [courts, rounds(8)],
    stages: (c, s) => [{ kind: "shootout", name: "Shootout", config: { courts: c.courts, rounds: c.rounds }, scoring: s.main }],
  },
  {
    id: "ladder", name: "Challenge ladder", family: "League", participant: "pair", allows: ["player", "pair"],
    scale: "Ongoing season", players: "6 to 200", summary: "Players challenge those just above them; winning challengers take their place.",
    how: ["Initial order by seed or rating", "Challenge up to N places above", "A challenger win takes the defender's place"],
    params: [{ key: "reach", label: "Challenge up to (places)", type: "number", default: 3, min: 1, max: 10 }],
    stages: (c, s) => [{ kind: "ladder", name: "Ladder", config: { reach: c.reach }, scoring: s.main }],
  },
  // ---------------- Social & rotating
  {
    id: "rotating", name: "Rotating partners round robin (mixer)", family: "Social & rotating", participant: "player",
    scale: "Clubs and socials", players: "4 to 200", summary: "New partner every round; individual standings. Repeat partners and opponents are minimised.",
    how: ["Players placed in foursomes each round", "Partners and opponents rotate, sit-outs rotate fairly", "Individual standings by wins then point difference"],
    params: [courts, rounds(7)],
    stages: (c, s) => [{ kind: "rotating", name: "Mixer rounds", config: { courts: c.courts, rounds: c.rounds }, scoring: s.main }],
  },
  {
    id: "americano", name: "Americano", family: "Social & rotating", participant: "player",
    scale: "Socials, 8 to 32 players", players: "8 to 64", summary: "Rotating partners; every point you win counts. Ranking by total points.",
    how: ["Fixed number of points or time per game", "Partners rotate every round", "Individual ranking by points scored"],
    params: [courts, rounds(7)],
    stages: (c, s) => [{ kind: "americano", name: "Americano", config: { courts: c.courts, rounds: c.rounds }, scoring: s.main }],
  },
  {
    id: "mexicano", name: "Mexicano", family: "Social & rotating", participant: "player",
    scale: "Socials, balanced games", players: "8 to 64", summary: "After each round players are ranked; 1st and 4th play 2nd and 3rd on each court.",
    how: ["Round 1 by rating", "Later rounds group players by current points", "Balanced games every round"],
    params: [courts, rounds(6)],
    stages: (c, s) => [{ kind: "mexicano", name: "Mexicano", config: { courts: c.courts, rounds: c.rounds }, scoring: s.main }],
  },
  {
    id: "scramble", name: "Scramble (random partners)", family: "Social & rotating", participant: "player",
    scale: "Drop-in, open play", players: "4 to 200", summary: "Random partners and opponents each round.",
    how: ["Random foursomes each round", "Fair sit-out rotation", "Individual standings"],
    params: [courts, rounds(6)],
    stages: (c, s) => [{ kind: "rotating", name: "Scramble", config: { courts: c.courts, rounds: c.rounds, random: true }, scoring: s.main }],
  },
  // ---------------- Team
  {
    id: "mlp_team", name: "MLP-style team league", family: "Team", participant: "team", needsOwners: true,
    scale: "4 to 16 teams of 4+", players: "16+", summary: "Teams meet in ties of women's, men's and two mixed doubles; 2-2 goes to a singles DreamBreaker.",
    how: ["Round robin of teams (optionally pools)", "Each tie: WD, MD, MX1, MX2", "2-2 ties decided by a rally-scored singles DreamBreaker to 21 with a freeze at 20", "Owners submit lineups in the 30-minute window"],
    params: [{ ...groups, default: 1 }, { key: "advance", label: "Teams to playoffs (0 = none)", type: "number", default: 4, min: 0, max: 16 }],
    stages: (c, s) => [
      { kind: "team_ties", name: "Team round robin", config: { groups: c.groups, events: ["Women's doubles", "Men's doubles", "Mixed doubles 1", "Mixed doubles 2"], dreambreaker: true }, scoring: s.main },
      ...(c.advance ? [{ kind: "team_ties" as const, name: "Team playoffs", config: { knockout: true, topN: c.advance, events: ["Women's doubles", "Men's doubles", "Mixed doubles 1", "Mixed doubles 2"], dreambreaker: true }, scoring: s.playoff }] : []),
    ],
  },
  {
    id: "team_custom", name: "Custom team ties", family: "Team", participant: "team", needsOwners: true,
    scale: "Corporate, club and inter-city leagues", players: "8+", summary: "Choose the events in each tie (e.g. 3 doubles, best of 5 events); ties won on events.",
    how: ["Pick the events in a tie", "Teams play a round robin", "Optional decider singles when tied"],
    params: [{ key: "eventsPreset", label: "Events per tie", type: "select", default: "3d",
      options: [["3d", "Men's, women's, mixed doubles"], ["5mix", "5 doubles (best of 5)"], ["2s1d", "2 singles + 1 doubles (Davis Cup style)"]] },
      { key: "decider", label: "Singles decider if tied", type: "boolean", default: true }],
    stages: (c, s) => [{
      kind: "team_ties", name: "Team round robin",
      config: { events: { "3d": ["Men's doubles", "Women's doubles", "Mixed doubles"], "5mix": ["Doubles 1", "Doubles 2", "Doubles 3", "Doubles 4", "Doubles 5"], "2s1d": ["Singles 1", "Singles 2", "Doubles"] }[c.eventsPreset as string], dreambreaker: c.decider },
      scoring: s.main,
    }],
  },
  {
    id: "team_knockout", name: "Team knockout", family: "Team", participant: "team", needsOwners: true,
    scale: "8 to 32 teams, one day", players: "16+", summary: "Single-elimination bracket of team ties.",
    how: ["Seeded bracket of teams", "Each tie: WD, MD, MX1, MX2 + DreamBreaker", "Winners advance"],
    params: [],
    stages: (_c, s) => [{ kind: "team_ties", name: "Team knockout", config: { knockout: true, events: ["Women's doubles", "Men's doubles", "Mixed doubles 1", "Mixed doubles 2"], dreambreaker: true }, scoring: s.main }],
  },
  // ---------------- League
  {
    id: "box_league", name: "Box league", family: "League", participant: "pair", allows: ["player", "pair"],
    scale: "Season, boxes of 4 to 6", players: "8 to 400", summary: "Players grouped in small boxes by level play a round robin; top of each box moves up next season.",
    how: ["Boxes by rating", "Round robin inside each box over the season", "Promotion and relegation between boxes"],
    params: [{ key: "boxSize", label: "Players per box", type: "number", default: 5, min: 3, max: 8 }],
    stages: (c, s) => [{ kind: "round_robin", name: "Boxes", config: { boxSize: c.boxSize, labels: "Box" }, scoring: s.main }],
  },
  {
    id: "flex_league", name: "Flex league (double round robin)", family: "League", participant: "pair", allows: ["player", "pair"],
    scale: "Season", players: "4 to 20", summary: "Home-and-away round robin across a season, then playoffs.",
    how: ["Everyone plays everyone twice", "Table by points", "Optional top-4 playoff"],
    params: [{ key: "playoffs", label: "Top-4 playoff", type: "boolean", default: true }],
    stages: (c, s) => [
      { kind: "round_robin", name: "Season", config: { groups: 1, double: true }, scoring: s.main },
      ...(c.playoffs ? [{ kind: "single_elim" as const, name: "Playoffs", config: { topN: 4, bronze: false }, scoring: s.playoff }] : []),
    ],
  },
];

export const formatById = (id: string) => FORMATS.find((f) => f.id === id);

/** Fill defaults and expand a format into stages. */
export function expand(id: string, config: Record<string, unknown>, main: Scoring, playoffSc?: Scoring) {
  const f = formatById(id);
  if (!f) throw new Error(`Unknown format ${id}`);
  const c: Record<string, unknown> = {};
  for (const p of f.params) c[p.key] = config[p.key] ?? p.default;
  return { format: f, config: c, stages: f.stages(c, { main, playoff: playoffSc ?? main }) };
}
