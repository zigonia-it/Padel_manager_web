// Who gets a push message (Phase 18). Pure functions, so they can be tested without Deno or a database
// (test/push-recipients.test.js). The database stores each subscription's choices in `prefs`
// (migration 20260920230000_push_preferences.sql); index.ts reads them with the service role and filters here.

export type Category = "match" | "result" | "withdrawal";

export type Prefs = {
  match?: boolean;
  result?: boolean;
  withdrawal?: boolean;
  onlyMine?: boolean;
};

export type Subscriber = { id: string; player_id: string; subscription: unknown; prefs?: Prefs | null };

export const CATEGORIES: Category[] = ["match", "result", "withdrawal"];

// Old clients send no category: they were always about a match being ready.
export function normalizeCategory(value: unknown): Category {
  return CATEGORIES.includes(value as Category) ? (value as Category) : "match";
}

// The players of a match (both teams), by id.
export function matchPlayerIds(state: unknown, matchId: unknown): string[] {
  if (typeof matchId !== "string" || !matchId) return [];
  const rounds = (state as { rounds?: { matches?: unknown[] }[] } | null)?.rounds ?? [];
  for (const round of rounds) {
    for (const match of (round.matches ?? []) as { id?: string; teamOne?: { players?: { id?: string }[] }; teamTwo?: { players?: { id?: string }[] } }[]) {
      if (match.id !== matchId) continue;
      return [...(match.teamOne?.players ?? []), ...(match.teamTwo?.players ?? [])].map((player) => player.id).filter((id): id is string => typeof id === "string");
    }
  }
  return [];
}

// `participants`: the players a message is about (a match's players), or null when it concerns everyone (a new round).
// `targets`: the only players who should get it (a teammate who must decide), or null.
export function selectRecipients(
  subscribers: Subscriber[],
  { category, participants = null, targets = null }: { category: Category; participants?: string[] | null; targets?: string[] | null },
): Subscriber[] {
  return subscribers.filter((subscriber) => {
    const prefs = subscriber.prefs ?? {};
    if (prefs[category] === false) return false;
    if (targets && !targets.includes(subscriber.player_id)) return false;
    if (prefs.onlyMine === true && category !== "withdrawal" && participants && !participants.includes(subscriber.player_id)) return false;
    return true;
  });
}
