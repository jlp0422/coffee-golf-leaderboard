import { parseScore } from "./parse-score";

describe("parseScore", () => {
  it("parses a standard Coffee Golf score", () => {
    const input =
      "Coffee Golf - Feb 15 14 Strokes - Top 50% 🟦🟨🟥🟪🟩 2️⃣5️⃣2️⃣2️⃣3️⃣";
    const result = parseScore(input);

    expect(result.totalStrokes).toBe(14);
    expect(result.date.getMonth()).toBe(1); // February
    expect(result.date.getDate()).toBe(15);
    expect(result.holes).toHaveLength(5);
    expect(result.holes[0]).toEqual({
      color: "blue",
      strokes: 2,
      holeNumber: 1,
    });
    expect(result.holes[1]).toEqual({
      color: "yellow",
      strokes: 5,
      holeNumber: 2,
    });
    expect(result.holes[4]).toEqual({
      color: "green",
      strokes: 3,
      holeNumber: 5,
    });
  });

  it("parses with different color ordering", () => {
    const input =
      "Coffee Golf - Mar 1 10 Strokes 🟩🟥🟦🟨🟪 1️⃣3️⃣2️⃣2️⃣2️⃣";
    const result = parseScore(input);

    expect(result.totalStrokes).toBe(10);
    expect(result.holes[0].color).toBe("green");
    expect(result.holes[1].color).toBe("red");
    expect(result.holes[2].color).toBe("blue");
  });

  it("ignores Top X% text", () => {
    const input =
      "Coffee Golf - Jan 20 15 Strokes - Top 10% 🟦🟨🟥🟪🟩 3️⃣3️⃣3️⃣3️⃣3️⃣";
    const result = parseScore(input);
    expect(result.totalStrokes).toBe(15);
  });

  it("throws on mismatched stroke total", () => {
    const input =
      "Coffee Golf - Feb 15 20 Strokes 🟦🟨🟥🟪🟩 2️⃣5️⃣2️⃣2️⃣3️⃣";
    expect(() => parseScore(input)).toThrow("Score mismatch");
  });

  it("throws on missing date", () => {
    const input = "14 Strokes 🟦🟨🟥🟪🟩 2️⃣5️⃣2️⃣2️⃣3️⃣";
    expect(() => parseScore(input)).toThrow("Could not find date");
  });

  it("throws on wrong number of colors", () => {
    const input =
      "Coffee Golf - Feb 15 6 Strokes 🟦🟨🟥 2️⃣2️⃣2️⃣";
    expect(() => parseScore(input)).toThrow("Expected 5 color holes");
  });

  it("handles score without Top percentage", () => {
    const input =
      "Coffee Golf - Feb 15 14 Strokes 🟦🟨🟥🟪🟩 2️⃣5️⃣2️⃣2️⃣3️⃣";
    const result = parseScore(input);
    expect(result.totalStrokes).toBe(14);
  });
});
