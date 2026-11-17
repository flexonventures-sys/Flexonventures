# Tournament formats

Flexon runs any of the formats below, live, with players, pairs or teams. An organiser picks a format per
category in **Console → New tournament** (`/console`), sets its options, and the engine expands it into
stages. Each stage generates its own matches, routes winners and losers, and keeps standings.

The catalog lives in `lib/formats/catalog.ts`. Bracket maths is in `lib/formats/brackets.ts`, round-by-round
pairing in `lib/formats/rounds.ts`, and the database side in `lib/formats/engine.ts`. All of them have unit tests.

## Catalog

| Family | Format | Entries | How it runs |
| --- | --- | --- | --- |
| Elimination | Single elimination | singles or doubles | Seeded draw (1 v N), byes to top seeds, optional bronze match |
| | Double elimination | singles or doubles | Winners and losers brackets; each winners-round loser drops in; grand final, optional reset |
| | Compass draw | singles or doubles | Every round's losers start a new direction bracket (East, West, North, South ...); everyone plays log2(N) matches |
| | Single elimination with consolation | singles or doubles | Main draw and a back draw for first-round losers |
| Round robin | Round robin (one or many pools, single or double) | singles or doubles | Snake-seeded pools, circle-method schedule |
| Pool play + playoffs | Pools → single elimination | singles or doubles | Top N per pool, crossover seeding (pool winners meet other pools' runners-up) |
| | Pools → double elimination | singles or doubles | As above into a double-elimination playoff |
| | Pools → medal round | singles or doubles | Top 4 overall into semi-finals, gold and bronze |
| | Skill-flighted double elimination | doubles | Seeding pools split the field into Gold and Silver double-elimination flights |
| Progressive | Swiss system | singles or doubles | Equal records meet, no rematches, fair byes; optional top cut to playoffs |
| | King / Queen of the Court | pairs | Winners move up a court, losers move down |
| | Shootout / Up & Down the River | individuals | 4 per court, winners up, losers down, partners split each round |
| League | Challenge ladder | singles or doubles | Challenge up to N places above; a challenger win takes the place |
| | Box league | singles or doubles | Small boxes by level, round robin inside each box |
| | Flex league | singles or doubles | Double round robin season, optional top-4 playoff |
| Social & rotating | Rotating partners (mixer) | individuals | New partner every round, repeats minimised, fair sit-outs |
| | Americano | individuals | Rotating partners, ranked by total points won |
| | Mexicano | individuals | Ranked after each round; 1st and 4th v 2nd and 3rd on each court |
| | Scramble | individuals | Random partners and opponents every round |
| Team | MLP-style team league | teams | Ties of WD, MD, MX1, MX2; a 2-2 tie goes to a rally-scored singles DreamBreaker to 21 with a freeze at 20 |
| | Custom team ties | teams | Choose events per tie (3 doubles, 5 doubles, Davis-Cup 2 singles + 1 doubles), optional decider |
| | Team knockout | teams | Single-elimination bracket of team ties |

## Scoring presets

Side-out to 11, 15 or 21; best of 1, 3 or 5; rally to 11, 15 or 21; win-by-1 and capped games; the MLP freeze
(at game point a receiving side wins only the serve); timed games. Pools and playoffs can score differently.
Referees score rally by rally, and the engine applies the right rules for the format.

## Running a tournament (Console)

1. **New tournament.** Add categories, pick a format for each, set options and scoring.
2. **Entries.** Add players or pairs from the directory, or teams. Players' own online entries also arrive here. Set seeds.
3. **Teams** (team formats). Create teams, assign an owner login, build squads, switch owner access on or off.
4. **Draw & matches.** *Make the draw* for stage 1. Round-based formats get a *Next round* button. Later stages
   are *Seeded from previous stage* once it finishes. Tap any match to enter a score, start it for the referee,
   award a walkover, set team-event players, or correct a result (logged).
5. **Public.** `/t/<code>` shows every category with its bracket, pools, rounds, ties and standings, refreshing
   live. `/scoreboard/<match>` is a full-screen scoreboard for court TVs and streams.

## Verified end to end

`scripts/demo-formats.mjs` drives the real API as an organiser. It creates *Flexon Format Showcase*, enters
players and teams, plays every stage of 10 formats, and prints the standings. This includes a team tie that
goes 2-2, so a DreamBreaker is created automatically.
