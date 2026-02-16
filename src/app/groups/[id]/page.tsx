"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getGroup,
  getGroupMembers,
  getGroupLeaderboard,
  getGroupTournaments,
  leaveGroup,
  removeGroupMember,
} from "../actions";
import type { TournamentFormat } from "@/lib/types";
import { FORMAT_DISPLAY } from "@/lib/types";

interface GroupData {
  id: string;
  name: string;
  invite_code: string;
  role: string;
}

interface MemberData {
  user_id: string;
  role: string;
  profiles: { display_name: string } | null;
}

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  totalStrokes: number;
  roundsPlayed: number;
  average: number;
  bestRound: number;
}

interface TournamentData {
  id: string;
  name: string;
  format: TournamentFormat;
  start_date: string;
  end_date: string;
  status: string;
}

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = useState<GroupData | null>(null);
  const [members, setMembers] = useState<MemberData[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tournaments, setTournaments] = useState<TournamentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "leaderboard" | "members" | "tournaments"
  >("leaderboard");

  const load = useCallback(async () => {
    const [g, m, lb, t] = await Promise.all([
      getGroup(groupId),
      getGroupMembers(groupId),
      getGroupLeaderboard(groupId),
      getGroupTournaments(groupId),
    ]);
    setGroup(g as GroupData | null);
    setMembers(m as MemberData[]);
    setLeaderboard(lb as LeaderboardEntry[]);
    setTournaments(t as TournamentData[]);
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCopyCode = () => {
    if (group) {
      navigator.clipboard.writeText(group.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLeave = async () => {
    if (!confirm("Are you sure you want to leave this group?")) return;
    const result = await leaveGroup(groupId);
    if (result.error) {
      alert(result.error);
    } else {
      router.push("/groups");
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from the group?`)) return;
    const result = await removeGroupMember(groupId, userId);
    if (result.error) {
      alert(result.error);
    } else {
      load();
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 md:py-12">
        <div className="text-center py-12 text-green-800/40">Loading...</div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 md:py-12 text-center">
        <div className="text-5xl mb-4">&#128683;</div>
        <p className="text-green-800/60">Group not found or access denied</p>
        <Link
          href="/groups"
          className="text-green-700 hover:text-green-900 text-sm mt-4 inline-block"
        >
          &larr; Back to groups
        </Link>
      </div>
    );
  }

  const isOwner = group.role === "owner";
  const isAdmin = group.role === "admin" || isOwner;

  return (
    <div className="max-w-lg mx-auto px-4 py-8 md:py-12">
      {/* Header */}
      <Link
        href="/groups"
        className="text-green-700 hover:text-green-900 text-sm mb-4 inline-block"
      >
        &larr; All groups
      </Link>

      <div className="flex items-start justify-between mb-2">
        <h1
          className="text-2xl font-bold text-green-900"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {group.name}
        </h1>
        {!isOwner && (
          <button
            onClick={handleLeave}
            className="text-xs text-red-500 hover:text-red-700 px-2 py-1"
          >
            Leave
          </button>
        )}
      </div>

      {/* Invite code */}
      <div className="bg-white rounded-xl border border-green-900/10 p-3 mb-6 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-green-800/40 uppercase tracking-wider font-semibold">
            Invite Code
          </div>
          <div className="font-mono text-green-900 tracking-wider text-lg">
            {group.invite_code}
          </div>
        </div>
        <button
          onClick={handleCopyCode}
          className="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-800 rounded-lg text-sm font-medium transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-green-900/5 rounded-xl p-1">
        {(["leaderboard", "members", "tournaments"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              activeTab === tab
                ? "bg-white text-green-900 shadow-sm"
                : "text-green-800/50 hover:text-green-800"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "leaderboard" && (
        <div className="bg-white rounded-xl border border-green-900/10 overflow-hidden">
          <div className="bg-green-900 px-4 py-2.5">
            <span
              className="text-green-100 text-sm font-medium"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Leaderboard
            </span>
          </div>
          {leaderboard.length === 0 ? (
            <div className="p-8 text-center text-green-800/40 text-sm">
              No rounds submitted yet
            </div>
          ) : (
            <div className="divide-y divide-green-900/5">
              {leaderboard.map((entry, i) => (
                <div
                  key={entry.user_id}
                  className="px-4 py-3 flex items-center gap-3"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                      i === 0
                        ? "bg-yellow-400 text-yellow-900"
                        : i === 1
                        ? "bg-gray-300 text-gray-700"
                        : i === 2
                        ? "bg-amber-600 text-amber-100"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-green-900 text-sm truncate">
                      {entry.display_name}
                    </div>
                    <div className="text-[10px] text-green-800/40">
                      {entry.roundsPlayed} round
                      {entry.roundsPlayed !== 1 ? "s" : ""} &bull; Best:{" "}
                      {entry.bestRound || "-"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-lg font-bold text-green-900"
                      style={{ fontFamily: "Georgia, serif" }}
                    >
                      {entry.average || "-"}
                    </div>
                    <div className="text-[10px] text-green-800/40">avg</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "members" && (
        <div className="space-y-2">
          {members.map((member) => {
            const profile = member.profiles as { display_name: string } | null;
            return (
              <div
                key={member.user_id}
                className="bg-white rounded-xl border border-green-900/10 px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium text-green-900 text-sm">
                    {profile?.display_name || "Unknown"}
                  </div>
                  <div className="text-[10px] text-green-600 font-medium capitalize">
                    {member.role}
                  </div>
                </div>
                {isOwner && member.role !== "owner" && (
                  <button
                    onClick={() =>
                      handleRemoveMember(
                        member.user_id,
                        profile?.display_name || "this member"
                      )
                    }
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })}
          {members.length === 0 && (
            <div className="text-center py-8 text-green-800/40 text-sm">
              Unable to load members. Share the invite code to add people.
            </div>
          )}
        </div>
      )}

      {activeTab === "tournaments" && (
        <div className="space-y-3">
          {isAdmin && (
            <Link
              href={`/groups/${groupId}/tournament/new`}
              className="block bg-green-800 hover:bg-green-900 text-white rounded-xl p-4 text-center transition-colors"
            >
              <div className="text-xl mb-1">&#127942;</div>
              <div className="font-medium text-sm">Create Tournament</div>
            </Link>
          )}

          {tournaments.length === 0 ? (
            <div className="text-center py-8 text-green-800/40 text-sm">
              No tournaments yet
            </div>
          ) : (
            tournaments.map((t) => (
              <Link
                key={t.id}
                href={`/groups/${groupId}/tournament/${t.id}`}
                className="block bg-white rounded-xl border border-green-900/10 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-1">
                  <h3
                    className="font-semibold text-green-900"
                    style={{ fontFamily: "Georgia, serif" }}
                  >
                    {t.name}
                  </h3>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      t.status === "active"
                        ? "bg-green-100 text-green-700"
                        : t.status === "upcoming"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
                <div className="text-xs text-green-800/50">
                  {FORMAT_DISPLAY[t.format]?.label || t.format} &bull;{" "}
                  {new Date(t.start_date + "T00:00:00").toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric" }
                  )}{" "}
                  &ndash;{" "}
                  {new Date(t.end_date + "T00:00:00").toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric" }
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
