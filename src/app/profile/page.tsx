"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getProfile, updateProfile, updateAvatar } from "./actions";
import { createClient } from "@/lib/supabase/client";
import LoadingSpinner from "@/components/LoadingSpinner";

interface ProfileData {
  id: string;
  display_name: string;
  avatar_url: string | null;
  email?: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const load = async () => {
    const data = await getProfile();
    if (data) {
      setProfile(data as ProfileData);
      setDisplayName(data.display_name);
    }
    setLoading(false);
  };

  useEffect(() => { document.title = "Coffee Golf - Profile"; }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const result = await updateProfile(displayName);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Display name updated!" });
      await load();
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please select an image file" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image must be under 2MB" });
      return;
    }

    setUploading(true);
    setMessage(null);

    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const fileName = `${profile?.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      setMessage({ type: "error", text: uploadError.message });
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(fileName);

    const result = await updateAvatar(publicUrl);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Avatar updated!" });
      await load();
    }
    setUploading(false);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      <h1
        className="text-2xl font-bold text-green-900 mb-6"
        style={{ fontFamily: "Georgia, serif" }}
      >
        Profile
      </h1>

      {/* Avatar */}
      <div className="bg-white rounded-xl border border-green-900/10 p-6 mb-4">
        <div className="flex items-center gap-5">
          <div className="relative">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt="Avatar"
                width={80}
                height={80}
                className="w-20 h-20 rounded-full object-cover border-2 border-green-900/10"
                unoptimized
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center border-2 border-green-900/10">
                <span className="text-3xl text-green-800/40">
                  {profile?.display_name?.[0]?.toUpperCase() || "?"}
                </span>
              </div>
            )}
            <label
              htmlFor="avatar-upload"
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-800 hover:bg-green-900 text-white rounded-full flex items-center justify-center cursor-pointer text-xs transition-colors"
            >
              {uploading ? "…" : "✏️"}
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
              disabled={uploading}
            />
          </div>
          <div>
            <div
              className="font-semibold text-green-900 text-lg"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {profile?.display_name}
            </div>
            <div className="text-sm text-green-800/50">{profile?.email}</div>
          </div>
        </div>
      </div>

      {/* Edit name */}
      <div className="bg-white rounded-xl border border-green-900/10 p-6 mb-4">
        <h2 className="text-sm font-semibold text-green-800/60 uppercase tracking-wider mb-3">
          Display Name
        </h2>
        <form onSubmit={handleSaveName} className="flex gap-2">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={30}
            className="flex-1 px-4 py-2.5 border border-green-900/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white text-green-900"
          />
          <button
            type="submit"
            disabled={
              saving || displayName.trim() === profile?.display_name
            }
            className="px-5 py-2.5 bg-green-800 hover:bg-green-900 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "..." : "Save"}
          </button>
        </form>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-3 rounded-xl text-sm border ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
