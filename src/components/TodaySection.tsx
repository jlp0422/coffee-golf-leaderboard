"use client";

import Link from "next/link";
import ScoreCard from "@/components/ScoreCard";
import { localDateStr } from "@/lib/date-utils";
import type { HoleColor } from "@/lib/types";

interface RoundData {
  id: string;
  played_date: string;
  total_strokes: number;
  hole_scores: { color: HoleColor; strokes: number; hole_number: number }[];
}

export default function TodaySection({ rounds }: { rounds: RoundData[] }) {
  const todayStr = localDateStr(); // user's local date
  const todayRound = rounds.find((r) => r.played_date === todayStr);

  if (todayRound) {
    return (
      <div className="mb-8">
        {/* Congrats banner */}
        <div className="bg-green-800/5 border border-green-900/10 rounded-xl p-4 mb-4 flex items-center justify-between">
          <div>
            <div
              className="font-semibold text-green-900"
              style={{ fontFamily: "Georgia, serif" }}
            >
              ☕ Nice round today!
            </div>
            <div className="text-green-800/50 text-sm mt-0.5">
              See you on the course tomorrow
            </div>
          </div>
          <span className="text-3xl">⛳</span>
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-green-800/40 uppercase tracking-wider">
            Today&apos;s Round
          </h2>
          <Link
            href="/submit"
            className="text-xs text-green-700 hover:text-green-900 font-medium"
          >
            ✏️ Edit score
          </Link>
        </div>
        <ScoreCard
          date={todayRound.played_date}
          totalStrokes={todayRound.total_strokes}
          holes={todayRound.hole_scores || []}
        />
      </div>
    );
  }

  return (
    <Link
      href="/submit"
      className="block mb-8 bg-green-800 hover:bg-green-900 text-white rounded-xl p-5 transition-colors group"
    >
      <div className="flex items-center justify-between">
        <div>
          <div
            className="font-semibold text-lg"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Submit today&apos;s score
          </div>
          <div className="text-green-200/70 text-sm mt-0.5">
            Paste your Coffee Golf result
          </div>
        </div>
        <span className="text-3xl group-hover:translate-x-1 transition-transform">
          ✏️
        </span>
      </div>
    </Link>
  );
}
