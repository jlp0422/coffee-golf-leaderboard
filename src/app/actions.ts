"use server";

import { createClient } from "@/lib/supabase/server";
import { parseScore } from "@/lib/parse-score";
import { localDateStr } from "@/lib/date-utils";
import { revalidatePath } from "next/cache";
import { HOLE_COLORS } from "@/lib/types";

export async function submitScore(rawInput: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  let parsed;
  try {
    parsed = parseScore(rawInput);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const playedDate = localDateStr(parsed.date);

  // Check if a score already exists for this date
  const { data: existing } = await supabase
    .from("rounds")
    .select("id")
    .eq("user_id", user.id)
    .eq("played_date", playedDate)
    .single();

  if (existing) {
    return { error: `You already submitted a score for ${playedDate}. Delete it first to resubmit.` };
  }

  // Insert round
  const { data: round, error: roundError } = await supabase
    .from("rounds")
    .insert({
      user_id: user.id,
      played_date: playedDate,
      total_strokes: parsed.totalStrokes,
      raw_input: rawInput.trim(),
    })
    .select()
    .single();

  if (roundError) {
    return { error: roundError.message };
  }

  // Insert hole scores
  const holeScores = parsed.holes.map((hole) => ({
    round_id: round.id,
    color: hole.color,
    strokes: hole.strokes,
    hole_number: hole.holeNumber,
  }));

  const { error: holesError } = await supabase
    .from("hole_scores")
    .insert(holeScores);

  if (holesError) {
    // Clean up the round if holes fail
    await supabase.from("rounds").delete().eq("id", round.id);
    return { error: holesError.message };
  }

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/stats");

  return { success: true, round };
}

export async function deleteRound(roundId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("rounds")
    .delete()
    .eq("id", roundId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/stats");

  return { success: true };
}

export async function getRounds() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("rounds")
    .select("*, hole_scores(*)")
    .eq("user_id", user.id)
    .order("played_date", { ascending: false });

  return data || [];
}

// ============================================================
// RECORD BOOK
// ============================================================

type RawRecordRow = {
  round_id: string;
  user_id: string;
  display_name: string;
  played_date: string;
  total_strokes: number;
  hole_scores: { color: string; strokes: number; hole_number: number }[] | null;
};

export type RecordEntry = RawRecordRow & { rank: number };
export type RecordSet = { byPlayer: RecordEntry[]; topRounds: RecordEntry[] };
export type RecordsData = { sevenDay: RecordSet; thirtyDay: RecordSet; allTime: RecordSet };

function assignRanks(sorted: RawRecordRow[]): RecordEntry[] {
  let rank = 1;
  return sorted.map((entry, i) => {
    if (i > 0 && entry.total_strokes !== sorted[i - 1].total_strokes) rank = i + 1;
    return { ...entry, rank };
  });
}

function computeRecordSet(rows: RawRecordRow[], since: Date | null): RecordSet {
  const filtered = since
    ? rows.filter((r) => new Date(r.played_date + "T00:00:00") >= since)
    : rows;

  // Best by Player: one entry per user — lowest strokes, earliest date breaks ties
  const bestByUser = new Map<string, RawRecordRow>();
  filtered.forEach((r) => {
    const existing = bestByUser.get(r.user_id);
    if (
      !existing ||
      r.total_strokes < existing.total_strokes ||
      (r.total_strokes === existing.total_strokes && r.played_date < existing.played_date)
    ) {
      bestByUser.set(r.user_id, r);
    }
  });
  const byPlayerSorted = [...bestByUser.values()].sort(
    (a, b) => a.total_strokes - b.total_strokes || a.played_date.localeCompare(b.played_date)
  );
  const byPlayer = assignRanks(byPlayerSorted).filter((e) => e.rank <= 10);

  // Top Rounds: global — rows already sorted by total_strokes asc, played_date asc from RPC
  const topRounds = assignRanks(filtered).filter((e) => e.rank <= 10);

  return { byPlayer, topRounds };
}

export async function getRecords(): Promise<RecordsData | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_rounds_for_records");
  if (error || !data) return null;

  const now = new Date();
  const since7 = new Date(now);
  since7.setDate(now.getDate() - 7);
  const since30 = new Date(now);
  since30.setDate(now.getDate() - 30);

  return {
    sevenDay: computeRecordSet(data as RawRecordRow[], since7),
    thirtyDay: computeRecordSet(data as RawRecordRow[], since30),
    allTime: computeRecordSet(data as RawRecordRow[], null),
  };
}

export async function getStats() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: rounds } = await supabase
    .from("rounds")
    .select("*, hole_scores(*)")
    .eq("user_id", user.id)
    .order("played_date", { ascending: false });

  if (!rounds || rounds.length === 0) return null;

  // Calculate stats
  const totalRounds = rounds.length;
  const totalStrokes = rounds.reduce((sum, r) => sum + r.total_strokes, 0);
  const averageScore = totalStrokes / totalRounds;

  const bestRound = rounds.reduce(
    (best, r) =>
      r.total_strokes < best.total_strokes ? r : best,
    rounds[0]
  );

  // Calculate streak (consecutive days going backwards from most recent round).
  // We allow today to be unplayed — streak is measured from the last played date.
  // e.g. played Mon+Tue, today is Wed → streak is 2 (not 0).
  let currentStreak = 0;
  const todayStr = localDateStr(new Date());
  const mostRecentDate = rounds[0].played_date;

  // Determine offset: 0 if most recent round is today, 1 if it's yesterday, etc.
  // If the most recent round is older than yesterday the streak is already broken.
  const todayMs = new Date(todayStr + "T00:00:00").getTime();
  const mostRecentMs = new Date(mostRecentDate + "T00:00:00").getTime();
  const daysBehind = Math.round((todayMs - mostRecentMs) / 86_400_000);

  if (daysBehind <= 1) {
    for (let i = 0; i < rounds.length; i++) {
      const expectedDate = new Date(todayStr + "T00:00:00");
      expectedDate.setDate(expectedDate.getDate() - daysBehind - i);
      const expectedStr = localDateStr(expectedDate);
      if (rounds[i].played_date === expectedStr) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Per-color stats
  const colorStats: Record<string, { total: number; count: number; best: number }> = {};
  HOLE_COLORS.forEach((c) => {
    colorStats[c] = { total: 0, count: 0, best: Infinity };
  });

  rounds.forEach((round) => {
    if (round.hole_scores) {
      round.hole_scores.forEach((hs: { color: string; strokes: number }) => {
        const cs = colorStats[hs.color];
        if (cs) {
          cs.total += hs.strokes;
          cs.count++;
          if (hs.strokes < cs.best) cs.best = hs.strokes;
        }
      });
    }
  });

  const perColor: Record<string, { average: number; best: number; totalRounds: number }> = {};
  HOLE_COLORS.forEach((c) => {
    const cs = colorStats[c];
    perColor[c] = {
      average: cs.count > 0 ? cs.total / cs.count : 0,
      best: cs.count > 0 ? cs.best : 0,
      totalRounds: cs.count,
    };
  });

  return {
    totalRounds,
    averageScore: Math.round(averageScore * 10) / 10,
    bestRound: bestRound.total_strokes,
    bestRoundDate: bestRound.played_date,
    currentStreak,
    perColor,
  };
}
