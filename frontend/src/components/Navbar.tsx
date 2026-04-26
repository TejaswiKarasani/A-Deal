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

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
      <Link href="/" className="text-white font-bold text-lg tracking-tight">
        A-Deal
      </Link>

      <div className="flex items-center gap-6">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`text-sm transition ${
              pathname.startsWith(l.href)
                ? "text-white font-semibold"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {l.label}
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 hover:text-red-400 transition"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
