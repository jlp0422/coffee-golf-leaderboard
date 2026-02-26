import type { Metadata } from "next";
import { getRounds, getStats } from "@/app/actions";

export const metadata: Metadata = { title: "Coffee Golf - Leaderboard" };
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import ScoreCard from "@/components/ScoreCard";
import { COLOR_DISPLAY, type HoleColor } from "@/lib/types";
import TodaySection from "@/components/TodaySection";
import Greeting from "@/components/Greeting";

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [rounds, stats] = await Promise.all([getRounds(), getStats()]);

  const recentRounds = rounds.slice(0, 5);

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user?.id)
    .single();

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Golfer";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      {/* Greeting — client component for local time-of-day */}
      <div className="mb-8">
        <Greeting name={displayName} />
        <p className="text-green-800/60 text-sm mt-1">
          Track your Coffee Golf scores
        </p>
      </div>

      {/* Today's score or CTA — client component for local timezone date */}
      <TodaySection rounds={rounds} />

      {/* Quick stats */}
      {stats && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-green-800/40 uppercase tracking-wider mb-3">
            Your Stats
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-green-900/10 p-4">
              <div className="text-green-800/50 text-xs">Avg Score</div>
              <div
                className="text-2xl font-bold text-green-900 mt-1"
                style={{ fontFamily: "Georgia, serif" }}
              >
                {stats.averageScore}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-green-900/10 p-4">
              <div className="text-green-800/50 text-xs">Best Round</div>
              <div
                className="text-2xl font-bold text-green-900 mt-1"
                style={{ fontFamily: "Georgia, serif" }}
              >
                {stats.bestRound}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-green-900/10 p-4">
              <div className="text-green-800/50 text-xs">Rounds Played</div>
              <div
                className="text-2xl font-bold text-green-900 mt-1"
                style={{ fontFamily: "Georgia, serif" }}
              >
                {stats.totalRounds}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-green-900/10 p-4">
              <div className="text-green-800/50 text-xs">Streak</div>
              <div
                className="text-2xl font-bold text-green-900 mt-1"
                style={{ fontFamily: "Georgia, serif" }}
              >
                {stats.currentStreak} day{stats.currentStreak !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          {/* Per-color averages */}
          {stats.perColor && (
            <div className="mt-4 bg-white rounded-xl border border-green-900/10 p-4">
              <div className="text-green-800/50 text-xs mb-3">
                Average by Hole Color
              </div>
              <div className="flex items-end justify-between gap-2">
                {(
                  Object.entries(stats.perColor) as [
                    HoleColor,
                    { average: number; best: number; totalRounds: number }
                  ][]
                ).map(([color, data]) => {
                  const display = COLOR_DISPLAY[color];
                  return (
                    <div key={color} className="text-center flex-1">
                      <div
                        className={`${display.bg} text-white text-xl font-bold rounded-lg py-2 mb-1`}
                        style={{ fontFamily: "'Caveat', cursive" }}
                      >
                        {data.average > 0
                          ? (Math.round(data.average * 10) / 10).toFixed(1)
                          : "-"}
                      </div>
                      <div className="text-[10px] text-green-800/40">
                        {display.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent rounds */}
      {recentRounds.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-green-800/40 uppercase tracking-wider">
              Recent Rounds
            </h2>
            <Link
              href="/history"
              className="text-xs text-green-700 hover:text-green-900"
            >
              View all &rarr;
            </Link>
          </div>
          <div className="space-y-3">
            {recentRounds.map(
              (round: {
                id: string;
                played_date: string;
                total_strokes: number;
                hole_scores: { color: HoleColor; strokes: number; hole_number: number }[];
              }) => (
                <ScoreCard
                  key={round.id}
                  date={round.played_date}
                  totalStrokes={round.total_strokes}
                  holes={round.hole_scores || []}
                />
              )
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {rounds.length === 0 && !stats && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">&#9749;</div>
          <h2
            className="text-xl font-semibold text-green-900 mb-2"
            style={{ fontFamily: "Georgia, serif" }}
          >
            No rounds yet
          </h2>
          <p className="text-green-800/60 text-sm mb-6">
            Play a round of Coffee Golf and paste your score to get started
          </p>
          <Link
            href="/submit"
            className="inline-block bg-green-800 hover:bg-green-900 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
          >
            Submit your first score
          </Link>
        </div>
      )}
    </div>
  );
}
