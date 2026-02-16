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
