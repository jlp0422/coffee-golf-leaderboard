"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: "&#9971;&#65039;" },
  { href: "/submit", label: "Submit", icon: "&#9999;&#65039;" },
  { href: "/history", label: "History", icon: "&#128197;" },
  { href: "/stats", label: "Stats", icon: "&#128202;" },
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
      <div className="max-w-2xl mx-auto px-4">
        {/* Desktop header */}
        <div className="hidden md:flex items-center justify-between py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">&#9971;&#65039;</span>
            <span
              className="text-xl font-bold text-green-900"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Coffee Golf
            </span>
          </Link>
          <div className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "bg-green-100 text-green-900"
                    : "text-green-800/60 hover:text-green-900 hover:bg-green-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="ml-2 px-3 py-1.5 rounded-lg text-sm text-green-800/40 hover:text-red-600 hover:bg-red-50 transition-colors"
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
                pathname === item.href
                  ? "text-green-900"
                  : "text-green-800/40"
              }`}
            >
              <span
                className="text-xl"
                dangerouslySetInnerHTML={{ __html: item.icon }}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
