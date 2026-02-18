"use server";

import { createClient } from "@/lib/supabase/server";
import { parseScore } from "@/lib/parse-score";
import { localDateStr } from "@/lib/date-utils";
import { revalidatePath } from "next/cache";

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

  // Calculate streak (consecutive days going backwards)
  // Compare date strings directly — avoids timezone math issues
  let currentStreak = 0;
  const todayDate = new Date();

  for (let i = 0; i < rounds.length; i++) {
    const expectedDate = new Date(todayDate);
    expectedDate.setDate(expectedDate.getDate() - i);
    const expectedStr = localDateStr(expectedDate);

    if (rounds[i].played_date === expectedStr) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Per-color stats
  const colorStats: Record<string, { total: number; count: number; best: number }> = {};
  const colors = ["blue", "yellow", "red", "purple", "green"];
  colors.forEach((c) => {
    colorStats[c] = { total: 0, count: 0, best: 9 };
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
  colors.forEach((c) => {
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
