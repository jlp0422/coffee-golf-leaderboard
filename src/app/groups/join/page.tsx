"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { joinGroup } from "../actions";

export default function JoinGroupPage() {
  useEffect(() => { document.title = "Coffee Golf - Join Group"; }, []);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await joinGroup(code);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push(`/groups/${result.group?.id}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
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
        Join Group
      </h1>
      <p className="text-green-800/60 text-sm mb-6">
        Enter the invite code shared by a group member
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="code"
            className="block text-sm font-medium text-green-800 mb-1"
          >
            Invite Code
          </label>
          <input
            id="code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g., a1b2c3d4"
            required
            className="w-full px-4 py-3 border border-green-900/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white text-green-900 placeholder:text-green-800/30 font-mono tracking-wider text-center text-lg"
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="w-full py-3 bg-green-800 hover:bg-green-900 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Joining..." : "Join Group"}
        </button>
      </form>
    </div>
  );
}
