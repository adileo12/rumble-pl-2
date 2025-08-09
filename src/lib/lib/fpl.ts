export type FplFixture = {
  id: number;
  event: number | null;
  kickoff_time: string | null;
  team_h: number;
  team_a: number;
  finished: boolean;
  team_h_score: number | null;
  team_a_score: number | null;
};
export type FplTeam = {
  id: number;
  name: string;
  short_name: string;
};
export async function fetchFplFixtures(): Promise<FplFixture[]> {
  const res = await fetch("https://fantasy.premierleague.com/api/fixtures/", {
    headers: { "User-Agent": "RumbleMVP/1.0" },
    cache: "no-store"
  });
  if (!res.ok) throw new Error("FPL fixtures fetch failed");
  return res.json();
},
export async function fetchFplTeams(): Promise<FplTeam[]> {
  const res = await fetch("https://fantasy.premierleague.com/api/bootstrap-static/", {
    headers: { "User-Agent": "RumbleMVP/1.0" },
    cache: "no-store"
  });
  if (!res.ok) throw new Error("FPL teams fetch failed");
  const data = await res.json();
  return data.teams as FplTeam[];
}
