"use client";

import { COLOR_DISPLAY, type HoleColor } from "@/lib/types";

interface HoleScoreData {
  color: HoleColor;
  strokes: number;
  hole_number: number;
}

interface ScoreCardProps {
  date: string;
  totalStrokes: number;
  holes: HoleScoreData[];
  onDelete?: () => void;
  showDelete?: boolean;
}

export default function ScoreCard({
  date,
  totalStrokes,
  holes,
  onDelete,
  showDelete = false,
}: ScoreCardProps) {
  const formattedDate = new Date(date + "T00:00:00").toLocaleDateString(
    "en-US",
    {
      weekday: "short",
      month: "short",
      day: "numeric",
    }
  );

  // Sort holes by hole_number for display
  const sortedHoles = [...holes].sort(
    (a, b) => a.hole_number - b.hole_number
  );

  return (
    <div className="bg-white rounded-xl border border-green-900/10 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="bg-green-900 px-4 py-2.5 flex items-center justify-between">
        <span
          className="text-green-100 text-sm font-medium"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {formattedDate}
        </span>
        <span className="bg-white/20 text-white text-sm font-bold px-2.5 py-0.5 rounded-full">
          {totalStrokes}
        </span>
      </div>

      {/* Holes */}
      <div className="p-3">
        <div className="grid grid-cols-5 gap-2">
          {sortedHoles.map((hole) => {
            const display = COLOR_DISPLAY[hole.color];
            return (
              <div key={hole.color} className="text-center">
                <div
                  className={`w-full aspect-square rounded-lg ${display.bg} flex items-center justify-center`}
                >
                  <span
                    className="text-white text-3xl font-bold"
                    style={{ fontFamily: "'Caveat', cursive" }}
                  >
                    {hole.strokes}
                  </span>
                </div>
                <span className="text-[10px] text-green-800/50 mt-1 block">
                  {display.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete button */}
      {showDelete && onDelete && (
        <div className="px-3 pb-3">
          <button
            onClick={onDelete}
            className="w-full text-xs text-red-500 hover:text-red-700 hover:bg-red-50 py-1.5 rounded-lg transition-colors"
          >
            Delete round
          </button>
        </div>
      )}
    </div>
  );
}
