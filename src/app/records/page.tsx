"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRecords, type RecordEntry, type RecordsData } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";
import ScoreCard from "@/components/ScoreCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { HoleColor } from "@/lib/types";

type Period = "7d" | "30d" | "all";

const PERIODS: { key: Period; label: string }[] = [
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
  { key: "all", label: "All Time" },
];

function rankBadgeClass(rank: number): string {
  if (rank === 1) return "bg-yellow-400 text-yellow-900";
  if (rank === 2) return "bg-gray-300 text-gray-700";
  if (rank === 3) return "bg-amber-600 text-amber-100";
  return "bg-green-100 text-green-800";
}

function RecordRow({
  entry,
  isCurrentUser,
  expanded,
  onToggle,
}: {
  entry: RecordEntry;
  isCurrentUser: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const formattedDate = new Date(entry.played_date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const holes = (entry.hole_scores ?? []).map((hs) => ({
    color: hs.color as HoleColor,
    strokes: hs.strokes,
    hole_number: hs.hole_number,
  }));

  return (
    <div className={isCurrentUser ? "bg-green-50/60" : ""}>
      <div
        className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-green-900/[0.02] transition-colors"
        onClick={onToggle}
        role="button"
        aria-expanded={expanded}
      >
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${rankBadgeClass(entry.rank)}`}
        >
          {entry.rank}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-green-900 text-sm truncate">
            {entry.display_name}
          </div>
          <div className="text-[10px] text-green-800/40">{formattedDate}</div>
        </div>
        <div
          className="text-xl font-bold text-green-900 tabular-nums"
          style={{ fontFamily: "'Caveat', cursive" }}
        >
          {entry.total_strokes}
        </div>
        <div className="text-green-800/30 text-xs w-4 text-center">
          {expanded ? "▲" : "▼"}
        </div>
      </div>

      {expanded && holes.length > 0 && (
        <div className="px-3 pb-3">
          <ScoreCard
            date={entry.played_date}
            totalStrokes={entry.total_strokes}
            holes={holes}
          />
        </div>
      )}
    </div>
  );
}

function RecordSection({
  title,
  entries,
  currentUserId,
  expandedIds,
  onToggle,
  emptyMessage,
}: {
  title: string;
  entries: RecordEntry[];
  currentUserId: string | null;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  emptyMessage: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-green-900/10 overflow-hidden">
      <div className="bg-green-900 px-4 py-2.5">
        <span
          className="text-green-100 text-sm font-medium"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {title}
        </span>
      </div>
      {entries.length === 0 ? (
        <div className="p-8 text-center text-green-800/40 text-sm">{emptyMessage}</div>
      ) : (
        <div className="divide-y divide-green-900/5">
          {entries.map((entry) => (
            <RecordRow
              key={entry.round_id}
              entry={entry}
              isCurrentUser={entry.user_id === currentUserId}
              expanded={expandedIds.has(entry.round_id)}
              onToggle={() => onToggle(entry.round_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RecordsPage() {
  const [data, setData] = useState<RecordsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Coffee Golf - Record Book";
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null);
    });
    void getRecords().then((result) => {
      setData(result);
      setLoading(false);
    });
  }, []);

  const toggleExpand = (roundId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(roundId)) next.delete(roundId);
      else next.add(roundId);
      return next;
    });
  };

  const periodData = data
    ? period === "7d"
      ? data.sevenDay
      : period === "30d"
      ? data.thirtyDay
      : data.allTime
    : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      <Link
        href="/stats"
        className="text-green-700 hover:text-green-900 text-sm mb-4 inline-block"
      >
        &larr; Stats
      </Link>

      <h1
        className="text-2xl font-bold text-green-900 mb-5"
        style={{ fontFamily: "Georgia, serif" }}
      >
        Record Book
      </h1>

      {/* Period tabs */}
      <div className="flex gap-1 mb-6 bg-green-900/5 rounded-xl p-1">
        {PERIODS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === key
                ? "bg-white text-green-900 shadow-sm"
                : "text-green-800/50 hover:text-green-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : !data ? (
        <div className="text-center py-12 text-green-800/40 text-sm">
          No records available yet.
        </div>
      ) : (
        <div className="space-y-6">
          <RecordSection
            title="Best by Player"
            entries={periodData?.byPlayer ?? []}
            currentUserId={currentUserId}
            expandedIds={expandedIds}
            onToggle={toggleExpand}
            emptyMessage="No rounds played in this period."
          />
          <RecordSection
            title="Top Rounds"
            entries={periodData?.topRounds ?? []}
            currentUserId={currentUserId}
            expandedIds={expandedIds}
            onToggle={toggleExpand}
            emptyMessage="No rounds played in this period."
          />
        </div>
      )}
    </div>
  );
}
