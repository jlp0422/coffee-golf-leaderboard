"use client";

import { useEffect, useState } from "react";
import { parseScore, type ParsedRound } from "@/lib/parse-score";
import { submitScore } from "@/app/actions";
import ScorePreview from "@/components/ScorePreview";
import { useRouter } from "next/navigation";

export default function SubmitPage() {
  useEffect(() => { document.title = "Coffee Golf - Submit Score"; }, []);
  const [input, setInput] = useState("");
  const [parsed, setParsed] = useState<ParsedRound | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleInputChange = (value: string) => {
    setInput(value);
    setParseError(null);
    setSubmitError(null);
    setSuccess(false);

    if (value.trim().length === 0) {
      setParsed(null);
      return;
    }

    try {
      const result = parseScore(value);
      setParsed(result);
    } catch (e) {
      setParsed(null);
      setParseError((e as Error).message);
    }
  };

  const handleSubmit = async () => {
    if (!parsed) return;
    setSubmitting(true);
    setSubmitError(null);

    const result = await submitScore(input);

    if (result.error) {
      setSubmitError(result.error);
    } else {
      setSuccess(true);
      setInput("");
      setParsed(null);
      setTimeout(() => router.push("/"), 1500);
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      <h1
        className="text-2xl font-bold text-green-900 mb-1"
        style={{ fontFamily: "Georgia, serif" }}
      >
        Submit Score
      </h1>
      <p className="text-green-800/60 text-sm mb-6">
        Paste your Coffee Golf result below
      </p>

      {success ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">&#127942;</div>
          <h2
            className="text-lg font-semibold text-green-900 mb-1"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Score submitted!
          </h2>
          <p className="text-green-700/70 text-sm">
            Redirecting to dashboard...
          </p>
        </div>
      ) : (
        <>
          {/* Input area */}
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={`Paste your score here, e.g.:\nCoffee Golf - Feb 15 14 Strokes - Top 50% 🟦🟨🟥🟪🟩 2️⃣5️⃣2️⃣2️⃣3️⃣`}
              rows={4}
              className="w-full px-4 py-3 border border-green-900/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white text-green-900 placeholder:text-green-800/25 resize-none text-sm"
            />
            {/* Pencil decoration */}
            <div className="absolute top-3 right-3 text-lg opacity-30">
              &#9999;&#65039;
            </div>
          </div>

          {/* Parse error */}
          {parseError && input.trim().length > 0 && (
            <div className="mt-3 bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
              {parseError}
            </div>
          )}

          {/* Preview */}
          {parsed && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2 text-green-800/60 text-sm">
                <span>&#9989;</span>
                <span>Score parsed successfully</span>
              </div>
              <ScorePreview parsed={parsed} />

              {submitError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
                  {submitError}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-3 bg-green-800 hover:bg-green-900 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base"
              >
                {submitting ? "Submitting..." : "Submit Score"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
