import { getStats, getRounds } from "@/app/actions";
import { COLOR_DISPLAY, type HoleColor, HOLE_COLORS } from "@/lib/types";
import Link from "next/link";

export default async function StatsPage() {
  const [stats, rounds] = await Promise.all([getStats(), getRounds()]);

  if (!stats || rounds.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 md:py-12">
        <h1
          className="text-2xl font-bold text-green-900 mb-6"
          style={{ fontFamily: "Georgia, serif" }}
        >
          Statistics
        </h1>
        <div className="text-center py-12">
          <div className="text-5xl mb-4">&#128202;</div>
          <p className="text-green-800/60 mb-4">
            Play some rounds to see your stats
          </p>
          <Link
            href="/submit"
            className="inline-block bg-green-800 hover:bg-green-900 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
          >
            Submit a score
          </Link>
        </div>
      </div>
    );
  }

  // Build score distribution
  const scoreCounts: Record<number, number> = {};
  rounds.forEach((r: { total_strokes: number }) => {
    scoreCounts[r.total_strokes] = (scoreCounts[r.total_strokes] || 0) + 1;
  });
  const minScore = Math.min(...Object.keys(scoreCounts).map(Number));
  const maxScore = Math.max(...Object.keys(scoreCounts).map(Number));
  const maxCount = Math.max(...Object.values(scoreCounts));

  // Last 10 rounds trend
  const last10 = rounds.slice(0, 10).reverse();

  return (
    <div className="max-w-lg mx-auto px-4 py-8 md:py-12">
      <h1
        className="text-2xl font-bold text-green-900 mb-6"
        style={{ fontFamily: "Georgia, serif" }}
      >
        Statistics
      </h1>

      {/* Overview cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-green-900/10 p-4 text-center">
          <div className="text-green-800/50 text-xs">Average</div>
          <div
            className="text-2xl font-bold text-green-900 mt-1"
            style={{ fontFamily: "Georgia, serif" }}
          >
            {stats.averageScore}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-green-900/10 p-4 text-center">
          <div className="text-green-800/50 text-xs">Best</div>
          <div
            className="text-2xl font-bold text-green-900 mt-1"
            style={{ fontFamily: "Georgia, serif" }}
          >
            {stats.bestRound}
          </div>
          <div className="text-[10px] text-green-800/40 mt-0.5">
            {stats.bestRoundDate &&
              new Date(stats.bestRoundDate + "T00:00:00").toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric" }
              )}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-green-900/10 p-4 text-center">
          <div className="text-green-800/50 text-xs">Rounds</div>
          <div
            className="text-2xl font-bold text-green-900 mt-1"
            style={{ fontFamily: "Georgia, serif" }}
          >
            {stats.totalRounds}
          </div>
        </div>
      </div>

      {/* Per-color stats table */}
      <div className="bg-white rounded-xl border border-green-900/10 overflow-hidden mb-6">
        <div className="bg-green-900 px-4 py-2.5">
          <span
            className="text-green-100 text-sm font-medium"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Score by Color
          </span>
        </div>
        <div className="divide-y divide-green-900/5">
          {/* Header */}
          <div className="grid grid-cols-4 px-4 py-2 text-[10px] font-semibold text-green-800/40 uppercase tracking-wider">
            <div>Hole</div>
            <div className="text-center">Avg</div>
            <div className="text-center">Best</div>
            <div className="text-center">Rounds</div>
          </div>
          {HOLE_COLORS.map((color) => {
            const colorData = stats.perColor[color];
            const display = COLOR_DISPLAY[color];
            if (!colorData) return null;
            return (
              <div
                key={color}
                className="grid grid-cols-4 px-4 py-2.5 items-center"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded ${display.bg}`}
                  />
                  <span className="text-sm text-green-900 font-medium">
                    {display.label}
                  </span>
                </div>
                <div className="text-center text-sm text-green-900 font-semibold">
                  {colorData.average > 0
                    ? (Math.round(colorData.average * 10) / 10).toFixed(1)
                    : "-"}
                </div>
                <div className="text-center text-sm text-green-900 font-semibold">
                  {colorData.best > 0 ? colorData.best : "-"}
                </div>
                <div className="text-center text-sm text-green-800/50">
                  {colorData.totalRounds}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Score distribution */}
      <div className="bg-white rounded-xl border border-green-900/10 p-4 mb-6">
        <div className="text-green-800/50 text-xs mb-3 font-semibold uppercase tracking-wider">
          Score Distribution
        </div>
        <div className="flex items-end gap-1 h-24">
          {Array.from(
            { length: maxScore - minScore + 1 },
            (_, i) => minScore + i
          ).map((score) => {
            const count = scoreCounts[score] || 0;
            const height = count > 0 ? (count / maxCount) * 100 : 0;
            return (
              <div
                key={score}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div
                  className="w-full bg-green-600/80 rounded-t transition-all"
                  style={{ height: `${height}%`, minHeight: count > 0 ? 4 : 0 }}
                />
                <span className="text-[9px] text-green-800/40">{score}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent trend */}
      {last10.length > 1 && (
        <div className="bg-white rounded-xl border border-green-900/10 p-4">
          <div className="text-green-800/50 text-xs mb-3 font-semibold uppercase tracking-wider">
            Last {last10.length} Rounds
          </div>
          <div className="flex items-end gap-1 h-20">
            {last10.map(
              (
                round: { played_date: string; total_strokes: number },
                i: number
              ) => {
                const max = Math.max(
                  ...last10.map(
                    (r: { total_strokes: number }) => r.total_strokes
                  )
                );
                const min = Math.min(
                  ...last10.map(
                    (r: { total_strokes: number }) => r.total_strokes
                  )
                );
                const range = max - min || 1;
                const height =
                  ((round.total_strokes - min) / range) * 60 + 20;
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <span className="text-[9px] text-green-800/60 font-medium">
                      {round.total_strokes}
                    </span>
                    <div
                      className="w-full bg-green-700/70 rounded-t"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-[8px] text-green-800/30">
                      {new Date(
                        round.played_date + "T00:00:00"
                      ).toLocaleDateString("en-US", {
                        month: "narrow",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}
    </div>
  );
}
