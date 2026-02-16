export type HoleColor = "blue" | "yellow" | "red" | "purple" | "green";

export const HOLE_COLORS: HoleColor[] = [
  "blue",
  "yellow",
  "red",
  "purple",
  "green",
];

export const COLOR_DISPLAY: Record<
  HoleColor,
  { emoji: string; label: string; bg: string; text: string }
> = {
  blue: { emoji: "🟦", label: "Blue", bg: "bg-blue-500", text: "text-blue-700" },
  yellow: { emoji: "🟨", label: "Yellow", bg: "bg-yellow-400", text: "text-yellow-700" },
  red: { emoji: "🟥", label: "Red", bg: "bg-red-500", text: "text-red-700" },
  purple: { emoji: "🟪", label: "Purple", bg: "bg-purple-500", text: "text-purple-700" },
  green: { emoji: "🟩", label: "Green", bg: "bg-green-500", text: "text-green-700" },
};

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Round {
  id: string;
  user_id: string;
  played_date: string;
  total_strokes: number;
  raw_input: string;
  created_at: string;
  hole_scores?: HoleScore[];
}

export interface HoleScore {
  id: string;
  round_id: string;
  color: HoleColor;
  strokes: number;
  hole_number: number;
}

export interface PlayerStats {
  totalRounds: number;
  averageScore: number;
  bestRound: number;
  bestRoundDate: string | null;
  currentStreak: number;
  perColor: Record<
    HoleColor,
    { average: number; best: number; totalRounds: number }
  >;
}

export type TournamentFormat = "stroke_play" | "match_play" | "best_ball" | "skins";
export type TournamentStatus = "upcoming" | "active" | "completed";
export type GroupRole = "owner" | "admin" | "member";

export const FORMAT_DISPLAY: Record<TournamentFormat, { label: string; description: string }> = {
  stroke_play: {
    label: "Stroke Play",
    description: "Lowest cumulative total strokes wins",
  },
  match_play: {
    label: "Match Play",
    description: "Head-to-head, compare scores by color each day",
  },
  best_ball: {
    label: "Best Ball",
    description: "Team event — best score per color counts",
  },
  skins: {
    label: "Skins",
    description: "Win a color outright (no ties) to win the skin",
  },
};

export interface Group {
  id: string;
  name: string;
  created_by: string;
  invite_code: string;
  created_at: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: GroupRole;
  joined_at: string;
  profiles?: Profile;
}

export interface Tournament {
  id: string;
  group_id: string;
  name: string;
  format: TournamentFormat;
  start_date: string;
  end_date: string;
  team_size: number;
  status: TournamentStatus;
  created_by: string;
  created_at: string;
}

export interface TournamentParticipant {
  tournament_id: string;
  user_id: string;
  team_id: number | null;
  profiles?: Profile;
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  totalStrokes: number;
  roundsPlayed: number;
  average: number;
  bestRound: number;
}
