"use client";

import { useEffect, useState } from "react";
import { getRounds, deleteRound } from "@/app/actions";
import ScoreCard from "@/components/ScoreCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { HoleColor } from "@/lib/types";

interface RoundData {
  id: string;
  played_date: string;
  total_strokes: number;
  hole_scores: { color: HoleColor; strokes: number; hole_number: number }[];
}

export default function HistoryPage() {
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRounds = async () => {
    const data = await getRounds();
    setRounds(data as RoundData[]);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadRounds(); }, []);

  const handleDelete = async (roundId: string) => {
    if (!confirm("Delete this round? This cannot be undone.")) return;
    await deleteRound(roundId);
    await loadRounds();
  };

  // Group rounds by month
  const grouped: Record<string, RoundData[]> = {};
  rounds.forEach((round) => {
    const month = new Date(round.played_date + "T00:00:00").toLocaleDateString(
      "en-US",
      { month: "long", year: "numeric" }
    );
    if (!grouped[month]) grouped[month] = [];
    grouped[month].push(round);
  });

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      <h1
        className="text-2xl font-bold text-green-900 mb-1"
        style={{ fontFamily: "Georgia, serif" }}
      >
        Round History
      </h1>
      <p className="text-green-800/60 text-sm mb-6">
        {rounds.length} round{rounds.length !== 1 ? "s" : ""} played
      </p>

      {rounds.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">&#128196;</div>
          <p className="text-green-800/60">No rounds recorded yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([month, monthRounds]) => (
            <div key={month}>
              <h2 className="text-xs font-semibold text-green-800/40 uppercase tracking-wider mb-3">
                {month}
              </h2>
              <div className="space-y-3">
                {monthRounds.map((round) => (
                  <ScoreCard
                    key={round.id}
                    date={round.played_date}
                    totalStrokes={round.total_strokes}
                    holes={round.hole_scores || []}
                    showDelete
                    onDelete={() => handleDelete(round.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
