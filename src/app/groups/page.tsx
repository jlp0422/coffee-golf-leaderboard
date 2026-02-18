"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMyGroups } from "./actions";
import LoadingSpinner from "@/components/LoadingSpinner";

interface GroupWithMeta {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
  role: string;
  memberCount: number;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const data = await getMyGroups();
      setGroups(data as GroupWithMeta[]);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-bold text-green-900"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Groups
          </h1>
          <p className="text-green-800/60 text-sm mt-1">
            Compete with friends
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <Link
          href="/groups/create"
          className="bg-green-800 hover:bg-green-900 text-white rounded-xl p-4 text-center transition-colors"
        >
          <div className="text-2xl mb-1">&#10133;</div>
          <div className="font-medium text-sm">Create Group</div>
        </Link>
        <Link
          href="/groups/join"
          className="bg-white hover:bg-green-50 text-green-900 rounded-xl p-4 text-center border border-green-900/10 transition-colors"
        >
          <div className="text-2xl mb-1">&#128279;</div>
          <div className="font-medium text-sm">Join Group</div>
        </Link>
      </div>

      {/* Groups list */}
      {groups.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">&#127948;&#65039;</div>
          <h2
            className="text-xl font-semibold text-green-900 mb-2"
            style={{ fontFamily: "Georgia, serif" }}
          >
            No groups yet
          </h2>
          <p className="text-green-800/60 text-sm">
            Create a group or join one with an invite code
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="block bg-white rounded-xl border border-green-900/10 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3
                    className="font-semibold text-green-900"
                    style={{ fontFamily: "Georgia, serif" }}
                  >
                    {group.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-green-800/50">
                      {group.memberCount} member
                      {group.memberCount !== 1 ? "s" : ""}
                    </span>
                    <span className="text-xs text-green-800/30">&#8226;</span>
                    <span className="text-xs text-green-600 font-medium capitalize">
                      {group.role}
                    </span>
                  </div>
                </div>
                <span className="text-green-800/30 text-xl">&rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
