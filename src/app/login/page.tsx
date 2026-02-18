"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const DEV_EMAIL = process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN_EMAIL;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-redirect to dev-login route when env var is set
  useEffect(() => {
    if (DEV_EMAIL) {
      window.location.href = "/auth/dev-login";
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  // Show nothing while redirecting in dev mode
  if (DEV_EMAIL) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center">
        <p className="text-green-800/50 text-sm" style={{ fontFamily: "Georgia, serif" }}>
          Signing in as {DEV_EMAIL}…
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">&#9971;&#65039;</div>
          <h1
            className="text-4xl font-bold text-green-900"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Coffee Golf
          </h1>
          <p className="text-green-800/70 mt-2 text-lg">
            Track your daily brews
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-green-900/10 p-8 relative overflow-hidden">
          {/* Coffee stain decoration */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full border-[3px] border-amber-800/10 opacity-50" />
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full border-[2px] border-amber-800/5" />

          {sent ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">&#9993;&#65039;</div>
              <h2
                className="text-xl font-semibold text-green-900 mb-2"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Check your email
              </h2>
              <p className="text-green-800/70">
                We sent a magic link to{" "}
                <span className="font-medium text-green-900">{email}</span>
              </p>
              <p className="text-green-800/50 text-sm mt-4">
                Click the link in the email to sign in
              </p>
              <button
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
                className="mt-6 text-green-700 hover:text-green-900 text-sm underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <h2
                className="text-xl font-semibold text-green-900 mb-6 text-center"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Sign in or create account
              </h2>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-green-800 mb-1"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="golfer@example.com"
                    required
                    className="w-full px-4 py-3 border border-green-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-[#faf8f4] text-green-900 placeholder:text-green-800/30"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-green-800 hover:bg-green-900 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Sending link..." : "Send magic link"}
                </button>
              </form>

              <p className="text-center text-green-800/50 text-xs mt-6">
                No password needed — we&apos;ll send you a secure link
              </p>
            </>
          )}
        </div>

        {/* Footer decoration */}
        <div className="text-center mt-8 text-green-800/30 text-sm">
          &#9971;&#65039; &#9749; Handicap not included
        </div>
      </div>
    </div>
  );
}
