"use client";

import { COLOR_DISPLAY, type HoleColor } from "@/lib/types";
import type { ParsedRound } from "@/lib/parse-score";

interface ScorePreviewProps {
  parsed: ParsedRound;
}

export default function ScorePreview({ parsed }: ScorePreviewProps) {
  const formattedDate = parsed.date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="bg-[#faf8f4] rounded-xl border border-green-900/10 overflow-hidden">
      {/* Scorecard header */}
      <div className="bg-green-900 px-4 py-3">
        <div className="flex items-center justify-between">
          <span
            className="text-green-100 font-medium"
            style={{ fontFamily: "Georgia, serif" }}
          >
            {formattedDate}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-green-300 text-sm">Total</span>
            <span className="bg-white/20 text-white text-lg font-bold px-3 py-0.5 rounded-full">
              {parsed.totalStrokes}
            </span>
          </div>
        </div>
      </div>

      {/* Scorecard grid */}
      <div className="p-4">
        <div className="grid grid-cols-5 gap-3">
          {parsed.holes.map((hole, i) => {
            const display = COLOR_DISPLAY[hole.color as HoleColor];
            return (
              <div key={i} className="text-center">
                <div className="text-xs text-green-800/50 mb-1">
                  Hole {hole.holeNumber}
                </div>
                <div
                  className={`w-full aspect-square rounded-xl ${display.bg} flex items-center justify-center shadow-sm`}
                >
                  <span
                    className="text-white text-2xl font-bold"
                    style={{ fontFamily: "'Caveat', cursive" }}
                  >
                    {hole.strokes}
                  </span>
                </div>
                <div className="text-xs text-green-800/60 mt-1 font-medium">
                  {display.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
