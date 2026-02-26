"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getTournamentStandings,
  joinTournament,
  leaveTournament,
  getTournamentParticipants,
  getGroupMembers,
  getGroup,
  assignTeam,
  addParticipant,
  removeParticipant,
} from "../../../actions";
import { FORMAT_DISPLAY, type TournamentFormat } from "@/lib/types";
import { getTournamentStatus, statusBadgeClass } from "@/lib/tournament-utils";
import { createClient } from "@/lib/supabase/client";
import LoadingSpinner from "@/components/LoadingSpinner";

interface StandingEntry {
  user_id: string;
  display_name: string;
  team_id: number | null;
  score: number;
  rounds_played: number;
  detail: string;
  classic_score?: number;
}

interface TournamentData {
  id: string;
  group_id: string;
  name: string;
  format: TournamentFormat;
  start_date: string;
  end_date: string;
  team_size: number;
  status: string;
}

interface ParticipantData {
  user_id: string;
  team_id: number | null;
  profiles: { display_name: string } | null;
}

interface MemberData {
  user_id: string;
  role: string;
  profiles: { display_name: string } | null;
}

export default function TournamentDetailPage() {
  const params = useParams();
  const groupId = params.id as string;
  const tournamentId = params.tournamentId as string;

  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [standings, setStandings] = useState<StandingEntry[]>([]);
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [groupMembers, setGroupMembers] = useState<MemberData[]>([]);
  const [isParticipant, setIsParticipant] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [teamId, setTeamId] = useState<number>(1);
  const [activeView, setActiveView] = useState<"standings" | "pairings">(
    "standings"
  );
  const [scoreView, setScoreView] = useState<"pts" | "classic">("pts");

  const load = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);

    const [standingsData, parts, members, group] = await Promise.all([
      getTournamentStandings(tournamentId),
      getTournamentParticipants(tournamentId),
      getGroupMembers(groupId),
      getGroup(groupId),
    ]);

    if (standingsData) {
      setTournament(standingsData.tournament as TournamentData);
      setStandings(standingsData.standings as StandingEntry[]);
      document.title = `Coffee Golf - ${standingsData.tournament.name}`;
    }

    setParticipants(parts as ParticipantData[]);
    setGroupMembers(members as MemberData[]);

    if (group && ["owner", "admin"].includes(group.role)) {
      setIsAdmin(true);
    }

    if (user && parts) {
      setIsParticipant(
        parts.some((p: { user_id: string }) => p.user_id === user.id)
      );
    }

    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [tournamentId, groupId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleJoin = async () => {
    setActionLoading(true);
    const result = await joinTournament(
      tournamentId,
      tournament?.team_size && tournament.team_size > 1 ? teamId : undefined
    );
    if (result.error) alert(result.error);
    else await load();
    setActionLoading(false);
  };

  const handleLeave = async () => {
    if (!confirm("Leave this tournament?")) return;
    setActionLoading(true);
    const result = await leaveTournament(tournamentId);
    if (result.error) alert(result.error);
    else await load();
    setActionLoading(false);
  };

  const handleAssignTeam = async (userId: string, newTeamId: number) => {
    const result = await assignTeam(tournamentId, userId, newTeamId);
    if (result.error) alert(result.error);
    else await load();
  };

  const handleAddParticipant = async (userId: string) => {
    const result = await addParticipant(tournamentId, userId, 1);
    if (result.error) alert(result.error);
    else await load();
  };

  const handleRemoveParticipant = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from the tournament?`)) return;
    const result = await removeParticipant(tournamentId, userId);
    if (result.error) alert(result.error);
    else await load();
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12 text-center">
        <div className="text-5xl mb-4">&#128683;</div>
        <p className="text-green-800/60">Tournament not found</p>
        <Link
          href={`/groups/${groupId}`}
          className="text-green-700 hover:text-green-900 text-sm mt-4 inline-block"
        >
          &larr; Back to group
        </Link>
      </div>
    );
  }

  const formatInfo = FORMAT_DISPLAY[tournament.format];
  const isTeamFormat = tournament.team_size > 1;

  const effectiveStatus = getTournamentStatus(tournament.start_date, tournament.end_date);
  const isMatchPlay = tournament.format === "match_play";
  const scoreLabel = isMatchPlay
    ? scoreView === "classic" ? "Holes" : "Pts"
    : tournament.format === "skins"
    ? "Skins"
    : "Strokes";

  function formatClassicScore(net: number): string {
    if (net === 0) return "AS";
    if (net > 0) return `${net} UP`;
    return `${Math.abs(net)} DN`;
  }

  function classicScoreColor(net: number): string {
    if (net > 0) return "text-green-700";
    if (net < 0) return "text-red-600";
    return "text-green-900/50";
  }

  const displayedStandings = isMatchPlay && scoreView === "classic"
    ? [...standings].sort((a, b) => (b.classic_score ?? 0) - (a.classic_score ?? 0))
    : standings;

  // Group participants by team for pairing view
  const teamGroups: Record<number, ParticipantData[]> = {};
  participants.forEach((p) => {
    const tid = p.team_id || 0;
    if (!teamGroups[tid]) teamGroups[tid] = [];
    teamGroups[tid].push(p);
  });

  // Members not yet in tournament
  const nonParticipants = groupMembers.filter(
    (m) => !participants.some((p) => p.user_id === m.user_id)
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      <Link
        href={`/groups/${groupId}`}
        className="text-green-700 hover:text-green-900 text-sm mb-4 inline-block"
      >
        &larr; Back to group
      </Link>

      {/* Tournament header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <h1
            className="text-2xl font-bold text-green-900"
            style={{ fontFamily: "Georgia, serif" }}
          >
            {tournament.name}
          </h1>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadgeClass(effectiveStatus)}`}>
            {effectiveStatus}
          </span>
        </div>
        <div className="text-sm text-green-800/60">
          {formatInfo?.label} &bull;{" "}
          {new Date(tournament.start_date + "T00:00:00").toLocaleDateString(
            "en-US",
            { month: "short", day: "numeric" }
          )}{" "}
          &ndash;{" "}
          {new Date(tournament.end_date + "T00:00:00").toLocaleDateString(
            "en-US",
            { month: "short", day: "numeric" }
          )}
        </div>
        <div className="text-xs text-green-800/40 mt-1">
          {formatInfo?.description}
        </div>
        <Link
          href={`/groups/${groupId}/tournament/${tournamentId}/scorecard`}
          className="inline-flex items-center gap-2 mt-3 bg-green-800 hover:bg-green-900 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          📋 View Scorecard
        </Link>
      </div>

      {/* Join/Leave */}
      {!isParticipant ? (
        <div className="bg-white rounded-xl border border-green-900/10 p-4 mb-6">
          <p className="text-sm text-green-800/60 mb-3">
            Join this tournament to compete!
          </p>
          {isTeamFormat && !isAdmin && (
            <div className="mb-3">
              <label className="block text-xs font-medium text-green-800 mb-1">
                Team Number
              </label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-green-900/20 rounded-lg bg-white text-green-900 text-sm"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((t) => (
                  <option key={t} value={t}>
                    Team {t}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={handleJoin}
            disabled={actionLoading}
            className="w-full py-2.5 bg-green-800 hover:bg-green-900 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
          >
            {actionLoading ? "Joining..." : "Join Tournament"}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-green-50 rounded-xl border border-green-200 px-4 py-3 mb-6">
          <span className="text-sm text-green-700 font-medium">
            &#9989; You&apos;re in this tournament
          </span>
          <button
            onClick={handleLeave}
            disabled={actionLoading}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Leave
          </button>
        </div>
      )}

      {/* Tabs: Standings / Pairings */}
      {isTeamFormat && (
        <div className="flex gap-1 mb-4 bg-green-900/5 rounded-xl p-1">
          <button
            onClick={() => setActiveView("standings")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeView === "standings"
                ? "bg-white text-green-900 shadow-sm"
                : "text-green-800/50 hover:text-green-800"
            }`}
          >
            Standings
          </button>
          <button
            onClick={() => setActiveView("pairings")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeView === "pairings"
                ? "bg-white text-green-900 shadow-sm"
                : "text-green-800/50 hover:text-green-800"
            }`}
          >
            Pairings
          </button>
        </div>
      )}

      {/* Standings */}
      {(activeView === "standings" || !isTeamFormat) && (
        <div className="bg-white rounded-xl border border-green-900/10 overflow-hidden">
          <div className="bg-green-900 px-4 py-2.5 flex items-center justify-between">
            <span
              className="text-green-100 text-sm font-medium"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Standings
            </span>
            <div className="flex items-center gap-2">
              {isMatchPlay && (
                <div className="flex bg-green-800 rounded-lg p-0.5 gap-0.5">
                  {(["pts", "classic"] as const).map((view) => (
                    <button
                      key={view}
                      onClick={() => setScoreView(view)}
                      className={`w-14 py-1 rounded-md text-xs font-medium transition-colors text-center ${
                        scoreView === view
                          ? "bg-white text-green-900"
                          : "text-green-300 hover:text-white"
                      }`}
                    >
                      {view === "pts" ? "Pts" : "Classic"}
                    </button>
                  ))}
                </div>
              )}
              <span className="text-green-300 text-xs w-10 text-right">{scoreLabel}</span>
            </div>
          </div>

          {displayedStandings.length === 0 ? (
            <div className="p-8 text-center text-green-800/40 text-sm">
              No rounds played yet in the tournament period
            </div>
          ) : (
            <div className="divide-y divide-green-900/5">
              {displayedStandings.map((entry, i) => (
                <div
                  key={entry.user_id + (entry.team_id || "")}
                  className={`px-4 py-3 flex items-center gap-3 ${
                    entry.user_id === currentUserId ? "bg-green-50/50" : ""
                  }`}
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
                      {isMatchPlay && scoreView === "classic"
                        ? `${entry.classic_score !== undefined && entry.classic_score > 0 ? "+" : ""}${entry.classic_score ?? 0} holes vs field`
                        : entry.detail}
                    </div>
                  </div>
                  <div
                    className={`text-lg font-bold ${
                      isMatchPlay && scoreView === "classic"
                        ? classicScoreColor(entry.classic_score ?? 0)
                        : "text-green-900"
                    }`}
                    style={{ fontFamily: "Georgia, serif" }}
                  >
                    {isMatchPlay && scoreView === "classic"
                      ? formatClassicScore(entry.classic_score ?? 0)
                      : entry.score}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pairings (team format only) */}
      {activeView === "pairings" && isTeamFormat && (
        <div className="space-y-4">
          {/* Teams */}
          {Object.entries(teamGroups)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([tid, members]) => (
              <div
                key={tid}
                className="bg-white rounded-xl border border-green-900/10 overflow-hidden"
              >
                <div className="bg-green-800 px-4 py-2 flex items-center justify-between">
                  <span className="text-green-100 text-sm font-medium">
                    {parseInt(tid) === 0 ? "Unassigned" : `Team ${tid}`}
                  </span>
                  <span className="text-green-300 text-xs">
                    {members.length} player{members.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="divide-y divide-green-900/5">
                  {members.map((p) => {
                    const profile = p.profiles as {
                      display_name: string;
                    } | null;
                    const name = profile?.display_name || "Unknown";
                    return (
                      <div
                        key={p.user_id}
                        className="px-4 py-2.5 flex items-center justify-between"
                      >
                        <span className="text-sm text-green-900 font-medium">
                          {name}
                        </span>
                        {isAdmin && (
                          <div className="flex items-center gap-2">
                            <select
                              value={p.team_id || 0}
                              onChange={(e) =>
                                handleAssignTeam(
                                  p.user_id,
                                  parseInt(e.target.value)
                                )
                              }
                              className="px-2 py-1 border border-green-900/20 rounded-lg bg-white text-green-900 text-xs"
                            >
                              <option value={0}>Unassigned</option>
                              {[1, 2, 3, 4, 5, 6, 7, 8].map((t) => (
                                <option key={t} value={t}>
                                  Team {t}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() =>
                                handleRemoveParticipant(p.user_id, name)
                              }
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              &times;
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

          {/* Add members not yet in tournament */}
          {isAdmin && nonParticipants.length > 0 && (
            <div className="bg-white rounded-xl border border-green-900/10 overflow-hidden">
              <div className="bg-green-900/70 px-4 py-2">
                <span className="text-green-100 text-sm font-medium">
                  Add Players
                </span>
              </div>
              <div className="divide-y divide-green-900/5">
                {nonParticipants.map((m) => {
                  const profile = m.profiles as {
                    display_name: string;
                  } | null;
                  const name = profile?.display_name || "Unknown";
                  return (
                    <div
                      key={m.user_id}
                      className="px-4 py-2.5 flex items-center justify-between"
                    >
                      <span className="text-sm text-green-800/60">{name}</span>
                      <button
                        onClick={() => handleAddParticipant(m.user_id)}
                        className="text-xs bg-green-100 hover:bg-green-200 text-green-800 px-3 py-1 rounded-lg font-medium transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {participants.length === 0 && (
            <div className="text-center py-8 text-green-800/40 text-sm">
              No participants yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}
