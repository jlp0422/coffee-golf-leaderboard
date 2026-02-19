"use client";

import { useState } from "react";

export default function ShareStatsButton() {
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleShare() {
    setSharing(true);
    setError(null);
    try {
      const res = await fetch("/api/share-card");
      if (!res.ok) {
        throw new Error("Could not generate share card");
      }
      const blob = await res.blob();
      const file = new File([blob], "coffee-golf-stats.png", {
        type: "image/png",
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "My Coffee Golf Stats",
        });
      } else {
        // Fallback: open image in new tab
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      }
    } catch (err) {
      // User cancelled share — not a real error
      if (err instanceof Error && err.name === "AbortError") return;
      setError("Couldn't share. Try again.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleShare}
        disabled={sharing}
        className="flex items-center gap-2 bg-green-800 hover:bg-green-900 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
      >
        {sharing ? (
          <>
            <span className="animate-spin">⛳</span>
            Generating…
          </>
        ) : (
          <>
            <span>📤</span>
            Share my stats
          </>
        )}
      </button>
      {error && (
        <p className="text-red-600 text-xs mt-1">{error}</p>
      )}
    </div>
  );
}
