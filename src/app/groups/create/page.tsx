"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createGroup } from "../actions";

export default function CreateGroupPage() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await createGroup(name);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push(`/groups/${result.group?.id}`);
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
        Create Group
      </h1>
      <p className="text-green-800/60 text-sm mb-6">
        Start a group and invite your friends
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-green-800 mb-1"
          >
            Group Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Morning Brew Crew"
            required
            maxLength={50}
            className="w-full px-4 py-3 border border-green-900/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white text-green-900 placeholder:text-green-800/30"
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full py-3 bg-green-800 hover:bg-green-900 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating..." : "Create Group"}
        </button>
      </form>
    </div>
  );
}
