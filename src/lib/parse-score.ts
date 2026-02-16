export interface ParsedHole {
  color: string;
  strokes: number;
  holeNumber: number;
}

export interface ParsedRound {
  date: Date;
  totalStrokes: number;
  holes: ParsedHole[];
}

const COLOR_MAP: Record<string, string> = {
  "\u{1F7E6}": "blue",
  "\u{1F7E8}": "yellow",
  "\u{1F7E5}": "red",
  "\u{1F7EA}": "purple",
  "\u{1F7E9}": "green",
};

const DIGIT_MAP: Record<string, number> = {
  "1\uFE0F\u20E3": 1,
  "2\uFE0F\u20E3": 2,
  "3\uFE0F\u20E3": 3,
  "4\uFE0F\u20E3": 4,
  "5\uFE0F\u20E3": 5,
  "6\uFE0F\u20E3": 6,
  "7\uFE0F\u20E3": 7,
  "8\uFE0F\u20E3": 8,
  "9\uFE0F\u20E3": 9,
};

// Color emoji regex - matches the square emoji characters
const COLOR_REGEX = /\u{1F7E6}|\u{1F7E8}|\u{1F7E5}|\u{1F7EA}|\u{1F7E9}/gu;

// Keycap digit regex - matches emoji digits 1-9
const DIGIT_REGEX = /[1-9]\uFE0F\u20E3/g;

export function parseScore(input: string): ParsedRound {
  const trimmed = input.trim();

  // Extract date: "Coffee Golf - Feb 15" or "Coffee Golf - February 15"
  const dateMatch = trimmed.match(
    /Coffee\s+Golf\s*-\s*(\w+\s+\d{1,2})/i
  );
  let date: Date;
  if (dateMatch) {
    const currentYear = new Date().getFullYear();
    const parsed = new Date(`${dateMatch[1]}, ${currentYear}`);
    if (isNaN(parsed.getTime())) {
      throw new Error(`Could not parse date: "${dateMatch[1]}"`);
    }
    date = parsed;
  } else {
    throw new Error(
      'Could not find date. Expected format: "Coffee Golf - Mon DD"'
    );
  }

  // Extract total strokes: "14 Strokes"
  const strokeMatch = trimmed.match(/(\d+)\s*Strokes/i);
  if (!strokeMatch) {
    throw new Error('Could not find stroke count. Expected "X Strokes"');
  }
  const totalStrokes = parseInt(strokeMatch[1], 10);

  // Extract color sequence
  const colorMatches = [...trimmed.matchAll(COLOR_REGEX)];
  if (colorMatches.length !== 5) {
    throw new Error(
      `Expected 5 color holes, found ${colorMatches.length}`
    );
  }
  const colors = colorMatches.map((m) => COLOR_MAP[m[0]]);

  // Extract digit sequence
  const digitMatches = [...trimmed.matchAll(DIGIT_REGEX)];
  if (digitMatches.length !== 5) {
    throw new Error(
      `Expected 5 hole scores, found ${digitMatches.length}`
    );
  }
  const digits = digitMatches.map((m) => DIGIT_MAP[m[0]]);

  // Pair colors with scores
  const holes: ParsedHole[] = colors.map((color, i) => ({
    color,
    strokes: digits[i],
    holeNumber: i + 1,
  }));

  // Validate total
  const sum = digits.reduce((a, b) => a + b, 0);
  if (sum !== totalStrokes) {
    throw new Error(
      `Score mismatch: holes sum to ${sum}, but header says ${totalStrokes}`
    );
  }

  return { date, totalStrokes, holes };
}
