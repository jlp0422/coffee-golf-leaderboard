import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

// Hex values for hole colors (Tailwind classes can't be used in ImageResponse)
const COLOR_HEX: Record<string, { bg: string; label: string }> = {
  blue:   { bg: "#3b82f6", label: "Blue" },
  yellow: { bg: "#facc15", label: "Yellow" },
  red:    { bg: "#ef4444", label: "Red" },
  purple: { bg: "#a855f7", label: "Purple" },
  green:  { bg: "#22c55e", label: "Green" },
};

const HOLE_COLORS = ["blue", "yellow", "red", "purple", "green"];

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Fetch stats
  const { data: rounds } = await supabase
    .from("rounds")
    .select("*, hole_scores(*)")
    .eq("user_id", user.id)
    .order("played_date", { ascending: false });

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const displayName = profile?.display_name || user.email?.split("@")[0] || "Golfer";

  if (!rounds || rounds.length === 0) {
    return new Response("No rounds yet", { status: 404 });
  }

  const totalRounds = rounds.length;
  const totalStrokes = rounds.reduce((s: number, r: { total_strokes: number }) => s + r.total_strokes, 0);
  const averageScore = Math.round((totalStrokes / totalRounds) * 10) / 10;
  const bestRound = Math.min(...rounds.map((r: { total_strokes: number }) => r.total_strokes));

  // Streak
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < rounds.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expectedStr = `${expected.getFullYear()}-${String(expected.getMonth() + 1).padStart(2, "0")}-${String(expected.getDate()).padStart(2, "0")}`;
    if (rounds[i].played_date === expectedStr) streak++;
    else break;
  }

  // Per-color averages
  const colorTotals: Record<string, { total: number; count: number }> = {};
  HOLE_COLORS.forEach((c) => { colorTotals[c] = { total: 0, count: 0 }; });
  rounds.forEach((r: { hole_scores?: { color: string; strokes: number }[] }) => {
    r.hole_scores?.forEach((hs) => {
      if (colorTotals[hs.color]) {
        colorTotals[hs.color].total += hs.strokes;
        colorTotals[hs.color].count++;
      }
    });
  });

  const colorAvgs = HOLE_COLORS.map((c) => {
    const { total, count } = colorTotals[c];
    return { color: c, avg: count > 0 ? Math.round((total / count) * 10) / 10 : 0 };
  });

  const statCards = [
    { label: "Avg Score", value: String(averageScore) },
    { label: "Best Round", value: String(bestRound) },
    { label: "Rounds", value: String(totalRounds) },
    { label: "Streak", value: `${streak}d` },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: 600,
          height: 340,
          background: "#f5f0e8",
          display: "flex",
          flexDirection: "column",
          padding: "28px 32px 24px",
          fontFamily: "serif",
          position: "relative",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 13,
                color: "#6b7c5e",
                letterSpacing: 2,
                textTransform: "uppercase",
                marginBottom: 2,
              }}
            >
              Coffee Golf
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 22,
                fontWeight: 700,
                color: "#1a3d2b",
              }}
            >
              {displayName}&apos;s Stats
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 36 }}>⛳</div>
        </div>

        {/* Main stat cards */}
        <div style={{ display: "flex", marginBottom: 18 }}>
          {statCards.map(({ label, value }, i) => (
            <div
              key={label}
              style={{
                flex: 1,
                background: "white",
                borderRadius: 12,
                padding: "10px 8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                border: "1px solid rgba(26,61,43,0.08)",
                marginRight: i < statCards.length - 1 ? 10 : 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 10,
                  color: "#6b7c5e",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                {label}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#1a3d2b",
                  marginTop: 2,
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Color averages */}
        <div style={{ display: "flex" }}>
          {colorAvgs.map(({ color, avg }, i) => {
            const { bg, label } = COLOR_HEX[color];
            return (
              <div
                key={color}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  marginRight: i < colorAvgs.length - 1 ? 8 : 0,
                }}
              >
                <div
                  style={{
                    width: "100%",
                    background: bg,
                    borderRadius: 10,
                    padding: "8px 4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: color === "yellow" ? "#713f12" : "white",
                    fontSize: 20,
                    fontWeight: 700,
                    marginBottom: 4,
                  }}
                >
                  {avg > 0 ? avg.toFixed(1) : "-"}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 9,
                    color: "#6b7c5e",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  {label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: 14,
            right: 20,
            fontSize: 10,
            color: "rgba(26,61,43,0.3)",
            letterSpacing: 1,
          }}
        >
          coffee-golf-leaderboard.vercel.app
        </div>
      </div>
    ),
    { width: 600, height: 340 }
  );
}
