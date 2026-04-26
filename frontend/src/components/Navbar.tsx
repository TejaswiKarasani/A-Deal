"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/analytics", label: "Analytics" },
  { href: "/admin", label: "Admin" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  // Hide on landing / auth pages
  if (["/" , "/login", "/register"].includes(pathname)) return null;

  return (
    <nav className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur border-b border-gray-800 px-6 py-0 flex items-center justify-between h-14">
      <Link href="/" className="font-black text-white text-lg tracking-tight">
        A<span className="text-indigo-400">-</span>Deal
      </Link>

      <div className="flex items-center gap-1">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              pathname.startsWith(l.href)
                ? "bg-gray-800 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800/60"
            }`}
          >
            {l.label}
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="ml-3 text-sm text-gray-500 hover:text-red-400 transition px-3 py-1.5 rounded-md hover:bg-gray-800/60"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
