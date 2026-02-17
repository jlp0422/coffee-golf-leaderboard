"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: "⛳️" },
  { href: "/stats", label: "Stats", icon: "📊" },
  { href: "/groups", label: "Groups", icon: "🏌️" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-green-900/10 z-50 md:top-0 md:bottom-auto md:border-b md:border-t-0">
      <div className="max-w-4xl mx-auto px-6">
        {/* Desktop header */}
        <div className="hidden md:flex items-center justify-between py-3">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">⛳️</span>
            <span
              className="text-xl font-bold text-green-900"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Coffee Golf
            </span>
          </Link>
          <div className="flex items-center gap-1 ml-6">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                    ? "bg-green-100 text-green-900"
                    : "text-green-800/60 hover:text-green-900 hover:bg-green-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/submit"
              className="ml-2 px-4 py-1.5 rounded-lg text-sm font-medium bg-green-800 hover:bg-green-900 text-white transition-colors whitespace-nowrap"
            >
              + Submit Score
            </Link>
            <button
              onClick={handleLogout}
              className="ml-2 px-3 py-1.5 rounded-lg text-sm text-green-800/40 hover:text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Mobile bottom nav */}
        <div className="flex md:hidden items-center justify-around py-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                  ? "text-green-900"
                  : "text-green-800/40"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
