"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createTournament } from "../../../actions";
import { FORMAT_DISPLAY, type TournamentFormat } from "@/lib/types";

export default function CreateTournamentPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [name, setName] = useState("");
  const [format, setFormat] = useState<TournamentFormat>("stroke_play");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [teamSize, setTeamSize] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTeamFormat = format === "best_ball";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (new Date(endDate) < new Date(startDate)) {
      setError("End date must be after start date");
      setLoading(false);
      return;
    }

    const result = await createTournament({
      groupId,
      name,
      format,
      startDate,
      endDate,
      teamSize: isTeamFormat ? teamSize : 1,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push(`/groups/${groupId}/tournament/${result.tournament?.id}`);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8 md:py-12">
      <button
        onClick={() => router.back()}
        className="text-green-700 hover:text-green-900 text-sm mb-6 inline-block"
      >
        &larr; Back
      </button>

      <h1
        className="text-2xl font-bold text-green-900 mb-1"
        style={{ fontFamily: "Georgia, serif" }}
      >
        Create Tournament
      </h1>
      <p className="text-green-800/60 text-sm mb-6">
        Set up a competition for your group
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-green-800 mb-1">
            Tournament Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., February Showdown"
            required
            maxLength={50}
            className="w-full px-4 py-3 border border-green-900/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white text-green-900 placeholder:text-green-800/30"
          />
        </div>

        {/* Format */}
        <div>
          <label className="block text-sm font-medium text-green-800 mb-2">
            Format
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(
              Object.entries(FORMAT_DISPLAY) as [
                TournamentFormat,
                { label: string; description: string }
              ][]
            ).map(([key, info]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFormat(key)}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  format === key
                    ? "border-green-600 bg-green-50 ring-1 ring-green-600"
                    : "border-green-900/10 bg-white hover:bg-green-50"
                }`}
              >
                <div className="font-medium text-green-900 text-sm">
                  {info.label}
                </div>
                <div className="text-[10px] text-green-800/50 mt-0.5">
                  {info.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Team size (only for team formats) */}
        {isTeamFormat && (
          <div>
            <label className="block text-sm font-medium text-green-800 mb-1">
              Team Size
            </label>
            <select
              value={teamSize}
              onChange={(e) => setTeamSize(parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-green-900/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white text-green-900"
            >
              <option value={2}>2 players per team</option>
              <option value={3}>3 players per team</option>
              <option value={4}>4 players per team</option>
            </select>
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-green-800 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full px-4 py-3 border border-green-900/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white text-green-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-green-800 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="w-full px-4 py-3 border border-green-900/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white text-green-900"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !name.trim() || !startDate || !endDate}
          className="w-full py-3 bg-green-800 hover:bg-green-900 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating..." : "Create Tournament"}
        </button>
      </form>
    </div>
  );
}
