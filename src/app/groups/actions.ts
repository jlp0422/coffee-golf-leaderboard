"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { TournamentFormat, ScorecardDay, ScorecardRow, HoleColor } from "@/lib/types";
import { HOLE_COLORS } from "@/lib/types";

// Shared types for tournament calc functions
interface CalcParticipant {
  user_id: string;
  team_id: number | null;
  profiles?: { display_name?: string } | null;
}
interface CalcRound {
  user_id: string;
  played_date: string;
  total_strokes: number;
  hole_scores?: { color: string; strokes: number }[];
}
interface StandingEntry {
  user_id: string;
  display_name: string;
  team_id: number | null;
  score: number;
  rounds_played: number;
  detail: string;
  classic_score?: number; // match_play only: net holes won - lost vs all opponents
}

// ============================================================
// GROUP ACTIONS
// ============================================================

export async function createGroup(name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };
  if (!name.trim()) return { error: "Group name is required" };

  // Create group
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .insert({ name: name.trim(), created_by: user.id })
    .select()
    .single();

  if (groupError) return { error: groupError.message };

  // Add creator as owner
  const { error: memberError } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id, role: "owner" });

  if (memberError) return { error: memberError.message };

  revalidatePath("/groups");
  return { success: true, group };
}

export async function joinGroup(inviteCode: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };
  if (!inviteCode.trim()) return { error: "Invite code is required" };

  // Look up group by invite code
  const { data: group, error: lookupError } = await supabase
    .from("groups")
    .select("id, name")
    .eq("invite_code", inviteCode.trim())
    .single();

  if (lookupError || !group) return { error: "Invalid invite code" };

  // Check if already a member
  const { data: existing } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .single();

  if (existing) return { error: "You're already in this group" };

  // Join
  const { error: joinError } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id, role: "member" });

  if (joinError) return { error: joinError.message };

  revalidatePath("/groups");
  return { success: true, group };
}

export async function getMyGroups() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Get group IDs the user is a member of
  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, role")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) return [];

  const groupIds = memberships.map((m) => m.group_id);

  // Get group details
  const { data: groups } = await supabase
    .from("groups")
    .select("*")
    .in("id", groupIds)
    .order("created_at", { ascending: false });

  if (!groups) return [];

  // Attach role and member count
  const result = await Promise.all(
    groups.map(async (group) => {
      const membership = memberships.find((m) => m.group_id === group.id);

      // Count members by looking up all memberships for this group
      // Since our RLS only lets us see our own membership rows,
      // we count via a different approach - use the group_members count
      const { count } = await supabase
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", group.id);

      return {
        ...group,
        role: membership?.role || "member",
        memberCount: count || 0,
      };
    })
  );

  return result;
}

export async function getGroup(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: group } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .single();

  if (!group) return null;

  // Verify membership
  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership) return null;

  return { ...group, role: membership.role };
}

export async function getGroupMembers(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Verify user is a member first
  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership) return [];

  // Since RLS only shows own membership, we need to get member user_ids
  // through a different approach. We'll query group_members for all members
  // but RLS limits us. Instead, use a workaround: get profiles who have rounds
  // visible to us (via the group rounds policy), or just get all group_members.
  //
  // Actually, the RLS policy "Users can view their own memberships" means
  // we can only see our own row. For the group feature to work, we need
  // a policy that lets group members see co-members.
  // We'll handle this by querying with the group_id filter.
  //
  // NOTE: This requires the "Users can view their own memberships" policy
  // to be supplemented. For now, we return what we can see.
  const { data: members } = await supabase
    .from("group_members")
    .select("*, profiles(*)")
    .eq("group_id", groupId);

  return members || [];
}

export async function leaveGroup(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Check if owner
  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (membership?.role === "owner") {
    return { error: "Group owners cannot leave. Delete the group or transfer ownership first." };
  }

  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/groups");
  return { success: true };
}

export async function removeGroupMember(groupId: string, userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Can't remove yourself this way
  if (userId === user.id) return { error: "Use 'Leave group' instead" };

  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (error) return { error: error.message };

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

export async function updateGroupName(groupId: string, name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };
  if (!name.trim()) return { error: "Group name is required" };

  const { error } = await supabase
    .from("groups")
    .update({ name: name.trim() })
    .eq("id", groupId)
    .eq("created_by", user.id);

  if (error) return { error: error.message };

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

export async function deleteGroup(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify ownership
  const { data: group } = await supabase
    .from("groups")
    .select("created_by")
    .eq("id", groupId)
    .single();

  if (!group || group.created_by !== user.id) {
    return { error: "Only the group owner can delete the group" };
  }

  const { error } = await supabase
    .from("groups")
    .delete()
    .eq("id", groupId);

  if (error) return { error: error.message };

  revalidatePath("/groups");
  return { success: true };
}

// ============================================================
// TEAM PAIRING MANAGEMENT
// ============================================================

export async function assignTeam(
  tournamentId: string,
  userId: string,
  teamId: number
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify caller is group owner/admin
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("group_id")
    .eq("id", tournamentId)
    .single();

  if (!tournament) return { error: "Tournament not found" };

  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", tournament.group_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { error: "Only group owners/admins can assign teams" };
  }

  const { error } = await supabase
    .from("tournament_participants")
    .update({ team_id: teamId })
    .eq("tournament_id", tournamentId)
    .eq("user_id", userId);

  if (error) return { error: error.message };

  revalidatePath(`/groups`);
  return { success: true };
}

export async function addParticipant(
  tournamentId: string,
  userId: string,
  teamId?: number
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("group_id")
    .eq("id", tournamentId)
    .single();

  if (!tournament) return { error: "Tournament not found" };

  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", tournament.group_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { error: "Only group owners/admins can add participants" };
  }

  const { error } = await supabase
    .from("tournament_participants")
    .insert({
      tournament_id: tournamentId,
      user_id: userId,
      team_id: teamId ?? null,
    });

  if (error) {
    if (error.code === "23505") return { error: "Player already in tournament" };
    return { error: error.message };
  }

  revalidatePath(`/groups`);
  return { success: true };
}

export async function removeParticipant(tournamentId: string, userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("tournament_participants")
    .delete()
    .eq("tournament_id", tournamentId)
    .eq("user_id", userId);

  if (error) return { error: error.message };

  revalidatePath(`/groups`);
  return { success: true };
}

// ============================================================
// GROUP LEADERBOARD
// ============================================================

export async function getGroupLeaderboard(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Get all members (we can see due to RLS)
  const { data: members } = await supabase
    .from("group_members")
    .select("user_id, profiles(display_name)")
    .eq("group_id", groupId);

  if (!members || members.length === 0) return [];

  const memberIds = members.map((m) => m.user_id);

  // Get all rounds for these members
  const { data: rounds } = await supabase
    .from("rounds")
    .select("user_id, total_strokes, played_date")
    .in("user_id", memberIds)
    .order("played_date", { ascending: false });

  if (!rounds) return [];

  // Build leaderboard
  const statsMap: Record<
    string,
    { total: number; count: number; best: number }
  > = {};

  memberIds.forEach((id) => {
    statsMap[id] = { total: 0, count: 0, best: Infinity };
  });

  rounds.forEach((r) => {
    const s = statsMap[r.user_id];
    if (s) {
      s.total += r.total_strokes;
      s.count++;
      if (r.total_strokes < s.best) s.best = r.total_strokes;
    }
  });

  return members
    .map((m) => {
      const s = statsMap[m.user_id];
      const profile = m.profiles as unknown as { display_name: string } | null;
      return {
        user_id: m.user_id,
        display_name: profile?.display_name || "Unknown",
        totalStrokes: s.total,
        roundsPlayed: s.count,
        average:
          s.count > 0
            ? Math.round((s.total / s.count) * 10) / 10
            : 0,
        bestRound: s.count > 0 ? s.best : 0,
      };
    })
    .sort((a, b) => {
      // Players with no rounds go to the bottom; otherwise sort by average ascending
      if (a.average === 0 && b.average === 0) return 0;
      if (a.average === 0) return 1;
      if (b.average === 0) return -1;
      return a.average - b.average;
    });
}

// ============================================================
// TOURNAMENT ACTIONS
// ============================================================

export async function createTournament(data: {
  groupId: string;
  name: string;
  format: TournamentFormat;
  startDate: string;
  endDate: string;
  teamSize: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: tournament, error } = await supabase
    .from("tournaments")
    .insert({
      group_id: data.groupId,
      name: data.name.trim(),
      format: data.format,
      start_date: data.startDate,
      end_date: data.endDate,
      team_size: data.teamSize,
      status: new Date(data.startDate) <= new Date() ? "active" : "upcoming",
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Auto-join the creator
  await supabase.from("tournament_participants").insert({
    tournament_id: tournament.id,
    user_id: user.id,
    team_id: data.teamSize > 1 ? 1 : null,
  });

  revalidatePath(`/groups/${data.groupId}`);
  return { success: true, tournament };
}

export async function getGroupTournaments(groupId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("tournaments")
    .select("*")
    .eq("group_id", groupId)
    .order("start_date", { ascending: false });

  return data || [];
}

export async function getTournament(tournamentId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  return data;
}

export async function getTournamentParticipants(tournamentId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("tournament_participants")
    .select("*, profiles(display_name)")
    .eq("tournament_id", tournamentId);

  return data || [];
}

export async function joinTournament(tournamentId: string, teamId?: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("tournament_participants").insert({
    tournament_id: tournamentId,
    user_id: user.id,
    team_id: teamId ?? null,
  });

  if (error) {
    if (error.code === "23505") return { error: "You're already in this tournament" };
    return { error: error.message };
  }

  revalidatePath(`/groups`);
  return { success: true };
}

export async function leaveTournament(tournamentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("tournament_participants")
    .delete()
    .eq("tournament_id", tournamentId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/groups`);
  return { success: true };
}

// ============================================================
// TOURNAMENT STANDINGS
// ============================================================

export async function getTournamentStandings(tournamentId: string) {
  const supabase = await createClient();

  const tournament = await getTournament(tournamentId);
  if (!tournament) return null;

  const participants = await getTournamentParticipants(tournamentId);
  if (participants.length === 0) return { tournament, standings: [] };

  const participantIds = participants.map((p) => p.user_id);

  // Get all rounds within tournament date range for participants
  const { data: rounds } = await supabase
    .from("rounds")
    .select("*, hole_scores(*)")
    .in("user_id", participantIds)
    .gte("played_date", tournament.start_date)
    .lte("played_date", tournament.end_date)
    .order("played_date", { ascending: true });

  if (!rounds) return { tournament, standings: [] };

  // Calculate standings based on format
  switch (tournament.format) {
    case "stroke_play":
      return {
        tournament,
        standings: calcStrokePlay(participants, rounds),
      };
    case "match_play":
      return {
        tournament,
        standings: calcMatchPlay(participants, rounds),
      };
    case "best_ball":
      return {
        tournament,
        standings: calcBestBall(participants, rounds, tournament.team_size),
      };
    case "skins":
      return {
        tournament,
        standings: calcSkins(participants, rounds),
      };
    default:
      return { tournament, standings: [] };
  }
}

// ============================================================
// TOURNAMENT SCORECARD
// ============================================================

export async function getTournamentScorecard(tournamentId: string): Promise<{
  tournament: { id: string; name: string; format: string; start_date: string; end_date: string; team_size: number };
  participants: { user_id: string; team_id: number | null; display_name: string }[];
  days: ScorecardDay[];
} | null> {
  const supabase = await createClient();

  const tournament = await getTournament(tournamentId);
  if (!tournament) return null;

  const rawParticipants = await getTournamentParticipants(tournamentId);
  if (rawParticipants.length === 0) return { tournament, participants: [], days: [] };

  const participants = rawParticipants.map((p) => ({
    user_id: p.user_id,
    team_id: p.team_id ?? null,
    display_name: p.profiles?.display_name ?? "Unknown",
  }));

  const participantIds = participants.map((p) => p.user_id);

  // Fetch all rounds with hole scores within the tournament window
  const { data: rounds } = await supabase
    .from("rounds")
    .select("*, hole_scores(*)")
    .in("user_id", participantIds)
    .gte("played_date", tournament.start_date)
    .lte("played_date", tournament.end_date)
    .order("played_date", { ascending: true });

  if (!rounds || rounds.length === 0) return { tournament, participants, days: [] };

  // Build roundsByDate: date → userId → color → strokes
  const roundsByDate: Record<string, Record<string, Record<string, number>>> = {};
  rounds.forEach((r: { played_date: string; user_id: string; hole_scores?: { color: string; strokes: number }[] }) => {
    if (!roundsByDate[r.played_date]) roundsByDate[r.played_date] = {};
    roundsByDate[r.played_date][r.user_id] = {};
    (r.hole_scores ?? []).forEach((hs) => {
      roundsByDate[r.played_date][r.user_id][hs.color] = hs.strokes;
    });
  });

  // Sort participants: by team_id asc (nulls last), then display_name
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.team_id === null && b.team_id !== null) return 1;
    if (a.team_id !== null && b.team_id === null) return -1;
    if (a.team_id !== b.team_id) return (a.team_id ?? 0) - (b.team_id ?? 0);
    return a.display_name.localeCompare(b.display_name);
  });

  const isBestBall = tournament.format === "best_ball" && tournament.team_size > 1;

  // Group team members by team_id
  const teamMembers: Record<number, string[]> = {};
  if (isBestBall) {
    sortedParticipants.forEach((p) => {
      if (p.team_id !== null) {
        if (!teamMembers[p.team_id]) teamMembers[p.team_id] = [];
        teamMembers[p.team_id].push(p.user_id);
      }
    });
  }

  const days: ScorecardDay[] = Object.keys(roundsByDate).sort().map((date) => {
    const dayRounds = roundsByDate[date];

    const rows: ScorecardRow[] = HOLE_COLORS.map((color: HoleColor) => {
      // Determine which cells are "counting" for this color
      const countingUserIds = new Set<string>();

      if (isBestBall) {
        // For each team: find the min strokes among team members who played
        Object.entries(teamMembers).forEach(([, memberIds]) => {
          const scores = memberIds
            .filter((uid) => dayRounds[uid]?.[color] !== undefined)
            .map((uid) => ({ uid, strokes: dayRounds[uid][color] }));
          if (scores.length === 0) return;
          const minStrokes = Math.min(...scores.map((s) => s.strokes));
          scores.filter((s) => s.strokes === minStrokes).forEach((s) => countingUserIds.add(s.uid));
        });
      } else {
        // All formats: everyone who played counts
        sortedParticipants.forEach((p) => {
          if (dayRounds[p.user_id]?.[color] !== undefined) countingUserIds.add(p.user_id);
        });
      }

      return {
        color,
        cells: sortedParticipants.map((p) => ({
          user_id: p.user_id,
          display_name: p.display_name,
          team_id: p.team_id,
          strokes: dayRounds[p.user_id]?.[color] ?? null,
          isCounting: countingUserIds.has(p.user_id),
        })),
      };
    });

    // Player raw totals
    const playerTotals: Record<string, number> = {};
    sortedParticipants.forEach((p) => {
      const scores = Object.values(dayRounds[p.user_id] ?? {}) as number[];
      playerTotals[p.user_id] = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) : 0;
    });

    // Team best-ball totals (sum of counting scores per color per team)
    const teamTotals: Record<number, number> = {};
    if (isBestBall) {
      Object.entries(teamMembers).forEach(([teamIdStr, memberIds]) => {
        const teamId = Number(teamIdStr);
        let total = 0;
        HOLE_COLORS.forEach((color: HoleColor) => {
          const scores = memberIds
            .filter((uid) => dayRounds[uid]?.[color] !== undefined)
            .map((uid) => dayRounds[uid][color]);
          if (scores.length > 0) total += Math.min(...scores);
        });
        teamTotals[teamId] = total;
      });
    }

    return { date, rows, teamTotals, playerTotals };
  });

  return { tournament, participants: sortedParticipants, days };
}

function calcStrokePlay(participants: CalcParticipant[], rounds: CalcRound[]): StandingEntry[] {
  const stats: Record<string, { total: number; count: number }> = {};

  participants.forEach((p) => {
    stats[p.user_id] = { total: 0, count: 0 };
  });

  rounds.forEach((r) => {
    if (stats[r.user_id]) {
      stats[r.user_id].total += r.total_strokes;
      stats[r.user_id].count++;
    }
  });

  return participants
    .map((p) => {
      const s = stats[p.user_id];
      const profile = p.profiles ?? null;
      return {
        user_id: p.user_id,
        display_name: profile?.display_name || "Unknown",
        team_id: p.team_id,
        score: s.total,
        rounds_played: s.count,
        detail: `${s.total} strokes (${s.count} rounds)`,
      };
    })
    .sort((a, b) => {
      if (a.rounds_played === 0 && b.rounds_played === 0) return 0;
      if (a.rounds_played === 0) return 1;
      if (b.rounds_played === 0) return -1;
      return a.score - b.score;
    });
}

function calcMatchPlay(participants: CalcParticipant[], rounds: CalcRound[]): StandingEntry[] {
  // Group rounds by date
  const roundsByDate: Record<string, Record<string, { color: string; strokes: number }[]>> = {};

  rounds.forEach((r) => {
    if (!roundsByDate[r.played_date]) roundsByDate[r.played_date] = {};
    roundsByDate[r.played_date][r.user_id] = (r.hole_scores || []).map(
      (hs: { color: string; strokes: number }) => ({
        color: hs.color,
        strokes: hs.strokes,
      })
    );
  });

  // Calculate match play points and classic up/down score
  const points: Record<string, number> = {};
  const netHoles: Record<string, number> = {}; // classic: wins - losses
  participants.forEach((p) => {
    points[p.user_id] = 0;
    netHoles[p.user_id] = 0;
  });

  Object.values(roundsByDate).forEach((dayRounds) => {
    const playerIds = Object.keys(dayRounds);
    // Compare all pairs
    for (let i = 0; i < playerIds.length; i++) {
      for (let j = i + 1; j < playerIds.length; j++) {
        const a = playerIds[i];
        const b = playerIds[j];
        const aScores = dayRounds[a];
        const bScores = dayRounds[b];

        HOLE_COLORS.forEach((color) => {
          const aHole = aScores.find((s) => s.color === color);
          const bHole = bScores.find((s) => s.color === color);
          if (aHole && bHole) {
            if (aHole.strokes < bHole.strokes) {
              points[a] += 1;
              netHoles[a] += 1;
              netHoles[b] -= 1;
            } else if (bHole.strokes < aHole.strokes) {
              points[b] += 1;
              netHoles[b] += 1;
              netHoles[a] -= 1;
            } else {
              points[a] += 0.5;
              points[b] += 0.5;
              // halved hole: no change to netHoles
            }
          }
        });
      }
    }
  });

  return participants
    .map((p) => {
      const profile = p.profiles ?? null;
      const pts = points[p.user_id] || 0;
      const net = netHoles[p.user_id] || 0;
      return {
        user_id: p.user_id,
        display_name: profile?.display_name || "Unknown",
        team_id: p.team_id,
        score: pts,
        rounds_played: Object.values(roundsByDate).filter(
          (dr) => dr[p.user_id]
        ).length,
        detail: `${pts} pts`,
        classic_score: net,
      };
    })
    .sort((a, b) => b.score - a.score);
}

function calcBestBall(participants: CalcParticipant[], rounds: CalcRound[], teamSize: number): StandingEntry[] {
  if (teamSize <= 1) return calcStrokePlay(participants, rounds);

  // Group by team
  const teams: Record<number, string[]> = {};
  participants.forEach((p) => {
    const tid = p.team_id || 0;
    if (!teams[tid]) teams[tid] = [];
    teams[tid].push(p.user_id);
  });

  // Group rounds by date
  const roundsByDate: Record<string, Record<string, { color: string; strokes: number }[]>> = {};
  rounds.forEach((r) => {
    if (!roundsByDate[r.played_date]) roundsByDate[r.played_date] = {};
    roundsByDate[r.played_date][r.user_id] = (r.hole_scores || []).map(
      (hs: { color: string; strokes: number }) => ({
        color: hs.color,
        strokes: hs.strokes,
      })
    );
  });

  // Calculate best ball per team per day
  const teamScores: Record<number, { total: number; days: number }> = {};

  Object.entries(teams).forEach(([teamIdStr, memberIds]) => {
    const teamId = parseInt(teamIdStr);
    teamScores[teamId] = { total: 0, days: 0 };

    Object.values(roundsByDate).forEach((dayRounds) => {
      // Check if any team member played this day
      const playingMembers = memberIds.filter((id) => dayRounds[id]);
      if (playingMembers.length === 0) return;

      teamScores[teamId].days++;

      // Best score per COLOR across team members
      HOLE_COLORS.forEach((color) => {
        const scores = playingMembers
          .map((id) => dayRounds[id]?.find((s) => s.color === color)?.strokes)
          .filter((s): s is number => s !== undefined);
        if (scores.length > 0) teamScores[teamId].total += Math.min(...scores);
      });
    });
  });

  // Build team standings
  return Object.entries(teams)
    .map(([teamIdStr, memberIds]) => {
      const teamId = parseInt(teamIdStr);
      const ts = teamScores[teamId];
      const memberNames = memberIds
        .map((id) => {
          const p = participants.find((pp: { user_id: string }) => pp.user_id === id);
          const profile = p?.profiles ?? null;
          return profile?.display_name || "Unknown";
        })
        .join(" & ");

      return {
        user_id: memberIds[0],
        display_name: `Team ${teamId}: ${memberNames}`,
        team_id: teamId,
        score: ts.total,
        rounds_played: ts.days,
        detail: `${ts.total} strokes (${ts.days} days)`,
      };
    })
    .sort((a, b) => {
      if (a.rounds_played === 0) return 1;
      if (b.rounds_played === 0) return -1;
      return a.score - b.score;
    });
}

function calcSkins(participants: CalcParticipant[], rounds: CalcRound[]): StandingEntry[] {
  const roundsByDate: Record<string, Record<string, { color: string; strokes: number }[]>> = {};
  rounds.forEach((r) => {
    if (!roundsByDate[r.played_date]) roundsByDate[r.played_date] = {};
    roundsByDate[r.played_date][r.user_id] = (r.hole_scores || []).map(
      (hs: { color: string; strokes: number }) => ({
        color: hs.color,
        strokes: hs.strokes,
      })
    );
  });

  const skins: Record<string, number> = {};
  participants.forEach((p) => {
    skins[p.user_id] = 0;
  });

  let carryover = 0;

  // Process each day, each color
  const sortedDates = Object.keys(roundsByDate).sort();
  sortedDates.forEach((date) => {
    const dayRounds = roundsByDate[date];
    const playerIds = Object.keys(dayRounds);
    if (playerIds.length < 2) return;

    HOLE_COLORS.forEach((color) => {
      const scores: { userId: string; strokes: number }[] = [];
      playerIds.forEach((id) => {
        const hole = dayRounds[id]?.find((s) => s.color === color);
        if (hole) scores.push({ userId: id, strokes: hole.strokes });
      });

      if (scores.length < 2) {
        carryover++;
        return;
      }

      const minScore = Math.min(...scores.map((s) => s.strokes));
      const winners = scores.filter((s) => s.strokes === minScore);

      if (winners.length === 1) {
        // Outright win
        skins[winners[0].userId] += 1 + carryover;
        carryover = 0;
      } else {
        // Tie — skin carries over
        carryover++;
      }
    });
  });

  return participants
    .map((p) => {
      const profile = p.profiles ?? null;
      return {
        user_id: p.user_id,
        display_name: profile?.display_name || "Unknown",
        team_id: p.team_id,
        score: skins[p.user_id] || 0,
        rounds_played: Object.values(roundsByDate).filter(
          (dr) => dr[p.user_id]
        ).length,
        detail: `${skins[p.user_id] || 0} skins`,
      };
    })
    .sort((a, b) => b.score - a.score);
}
