"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getTournamentScorecard } from "../../../../actions";
import { COLOR_DISPLAY, HOLE_COLORS, FORMAT_DISPLAY, type HoleColor } from "@/lib/types";
import LoadingSpinner from "@/components/LoadingSpinner";

type ScorecardData = Awaited<ReturnType<typeof getTournamentScorecard>>;
type ScorecardDay = NonNullable<ScorecardData>["days"][number];

const TEAM_COLORS: Record<number, { header: string; border: string }> = {
  1: { header: "bg-green-700",  border: "border-l-2 border-green-300" },
  2: { header: "bg-amber-700",  border: "border-l-2 border-amber-300" },
  3: { header: "bg-blue-700",   border: "border-l-2 border-blue-300" },
  4: { header: "bg-purple-700", border: "border-l-2 border-purple-300" },
};

function formatDayTab(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return {
    weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  };
}

function ScorecardGrid({
  day,
  participants,
  isBestBall,
}: {
  day: ScorecardDay;
  participants: NonNullable<ScorecardData>["participants"];
  isBestBall: boolean;
}) {
  const teamIds = [...new Set(
    participants.map((p) => p.team_id).filter((t): t is number => t !== null)
  )];
  const hasTeams = teamIds.length > 0;

  return (
    <div className="overflow-x-auto rounded-xl border border-green-900/10 bg-white">
      <div
        className="grid"
        style={{ gridTemplateColumns: `120px repeat(${participants.length}, minmax(64px, 1fr))` }}
      >
        {/* Top-left corner */}
        <div className="bg-green-900 px-3 py-2.5 flex items-center">
          <span className="text-green-100 text-xs font-semibold uppercase tracking-wider">Hole</span>
        </div>

        {/* Participant column headers */}
        {participants.map((p) => {
          const teamColor = p.team_id !== null ? (TEAM_COLORS[p.team_id] ?? TEAM_COLORS[1]) : null;
          return (
            <div
              key={p.user_id}
              className={`px-2 py-2 text-center ${teamColor ? teamColor.header : "bg-green-900"} ${teamColor ? teamColor.border : ""}`}
            >
              <div className="text-white text-xs font-medium truncate leading-tight">
                {p.display_name.split(" ")[0]}
              </div>
              {hasTeams && p.team_id !== null && (
                <div className="text-white/60 text-[9px] mt-0.5">Team {p.team_id}</div>
              )}
            </div>
          );
        })}

        {/* Color rows */}
        {HOLE_COLORS.map((color: HoleColor, rowIdx) => {
          const display = COLOR_DISPLAY[color];
          const row = day.rows.find((r) => r.color === color);
          const isLastRow = rowIdx === HOLE_COLORS.length - 1;
          const borderClass = !isLastRow ? "border-b border-green-900/10" : "";

          return [
            <div
              key={`label-${color}`}
              className={`sticky left-0 z-10 bg-white flex items-center gap-2 px-3 py-3 ${borderClass}`}
            >
              <div className={`w-3.5 h-3.5 rounded-sm flex-shrink-0 ${display.bg}`} />
              <span className="text-sm font-medium text-green-900">{display.label}</span>
            </div>,

            ...(row?.cells ?? []).map((cell) => {
              return (
                <div
                  key={`${color}-${cell.user_id}`}
                  className={`flex items-center justify-center px-2 py-3 border-l border-green-900/10 ${borderClass}`}
                >
                  {cell.strokes !== null ? (
                    <span
                      className={`text-xl font-bold leading-none w-9 h-9 flex items-center justify-center rounded-lg ${
                        cell.isCounting ? "text-white bg-green-700 shadow-sm" : "text-green-900/35"
                      }`}
                      style={{ fontFamily: "'Caveat', cursive" }}
                    >
                      {cell.strokes}
                    </span>
                  ) : (
                    <span className="text-green-800/20 text-sm">—</span>
                  )}
                </div>
              );
            }),
          ];
        })}

        {/* Totals row */}
        <div className="sticky left-0 z-10 bg-green-50 border-t-2 border-green-900/10 px-3 py-2.5 flex items-center">
          <span className="text-xs font-bold text-green-900 uppercase tracking-wider">Total</span>
        </div>
        {participants.map((p) => {
          const rawTotal = day.playerTotals[p.user_id] ?? 0;
          const played = day.rows.some((r) => r.cells.find((c) => c.user_id === p.user_id)?.strokes !== null);
          return (
            <div
              key={`total-${p.user_id}`}
              className="bg-green-50 border-t-2 border-l border-green-900/10 flex items-center justify-center px-2 py-2.5"
            >
              {played ? (
                <span className="text-lg font-bold text-green-900" style={{ fontFamily: "'Caveat', cursive" }}>
                  {rawTotal}
                </span>
              ) : (
                <span className="text-green-800/20 text-sm">—</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Team best-ball footer */}
      {isBestBall && Object.keys(day.teamTotals).length > 0 && (
        <div className="border-t-2 border-green-900/20 bg-green-900 px-4 py-3 flex items-center gap-6">
          <span className="text-green-100 text-xs font-semibold uppercase tracking-wider">Best Ball</span>
          {teamIds.map((tid) => (
            <span key={tid} className="text-white text-sm font-bold">
              Team {tid}:{" "}
              <span style={{ fontFamily: "'Caveat', cursive" }} className="text-xl">
                {day.teamTotals[tid] ?? "—"}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ScorecardPage() {
  const params = useParams();
  const groupId = params.id as string;
  const tournamentId = params.tournamentId as string;

  const [data, setData] = useState<ScorecardData>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    getTournamentScorecard(tournamentId).then((result) => {
      setData(result);
      if (result && result.days.length > 0) {
        // Default to most recent day
        setSelectedDate(result.days[result.days.length - 1].date);
      }
      setLoading(false);
    });
  }, [tournamentId]);

  // Scroll active tab into view when selection changes
  useEffect(() => {
    if (activeTabRef.current && tabsRef.current) {
      activeTabRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [selectedDate]);

  if (loading) return <LoadingSpinner message="Loading scorecard…" />;

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-green-800/60">Tournament not found.</p>
      </div>
    );
  }

  const { tournament, participants, days } = data;
  const formatLabel = FORMAT_DISPLAY[tournament.format as keyof typeof FORMAT_DISPLAY]?.label ?? tournament.format;
  const isBestBall = tournament.format === "best_ball" && tournament.team_size > 1;
  const selectedDay = days.find((d) => d.date === selectedDate) ?? null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      {/* Header */}
      <div className="mb-5">
        <Link
          href={`/groups/${groupId}/tournament/${tournamentId}`}
          className="text-sm text-green-700 hover:text-green-900 font-medium mb-2 inline-block"
        >
          ← {tournament.name}
        </Link>
        <h1 className="text-2xl font-bold text-green-900" style={{ fontFamily: "Georgia, serif" }}>
          Scorecard
        </h1>
        <p className="text-green-800/50 text-sm mt-1">
          {formatLabel} ·{" "}
          {new Date(tournament.start_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          {" – "}
          {new Date(tournament.end_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
      </div>

      {days.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🏌️</div>
          <p className="text-green-800/60">No rounds played yet in the tournament period.</p>
        </div>
      ) : (
        <>
          {/* Day selector — horizontally scrollable pills */}
          <div
            ref={tabsRef}
            className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {days.map((day) => {
              const { weekday, date } = formatDayTab(day.date);
              const isActive = day.date === selectedDate;
              return (
                <button
                  key={day.date}
                  ref={isActive ? activeTabRef : null}
                  onClick={() => setSelectedDate(day.date)}
                  className={`flex-shrink-0 flex flex-col items-center px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-green-800 border-green-800 text-white"
                      : "bg-white border-green-900/10 text-green-800/70 hover:border-green-600/30 hover:text-green-900"
                  }`}
                >
                  <span className={`text-[10px] uppercase tracking-wider ${isActive ? "text-green-200" : "text-green-800/40"}`}>
                    {weekday}
                  </span>
                  <span>{date}</span>
                </button>
              );
            })}
          </div>

          {/* Scorecard grid for selected day */}
          {selectedDay ? (
            <>
              <ScorecardGrid day={selectedDay} participants={participants} isBestBall={isBestBall} />

              {/* Legend */}
              <div className="mt-4 flex items-center gap-4 text-xs text-green-800/50">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-green-700 rounded-lg text-white font-bold shadow-sm" style={{ fontFamily: "'Caveat', cursive" }}>3</span>
                  <span>Counting</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-6 h-6 text-green-900/35 font-bold" style={{ fontFamily: "'Caveat', cursive" }}>4</span>
                  <span>Not counting</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-green-800/20 font-bold">—</span>
                  <span>Did not play</span>
                </div>
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
