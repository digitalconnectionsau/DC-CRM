"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  HomeIcon,
  UsersIcon,
  GlobeAltIcon,
  TicketIcon,
  ArrowRightStartOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/clients", label: "Clients", icon: UsersIcon },
  { href: "/domains", label: "Domains", icon: GlobeAltIcon },
  { href: "/tickets", label: "Tickets", icon: TicketIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-brand-900 text-white flex flex-col min-h-screen">
      <div className="px-5 py-6 border-b border-brand-700">
        <span className="text-lg font-bold tracking-tight">DC Portal</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname.startsWith(href)
                ? "bg-brand-600 text-white"
                : "text-blue-100 hover:bg-brand-700"
            )}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-brand-700">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-blue-100 hover:bg-brand-700 w-full transition-colors"
        >
          <ArrowRightStartOnRectangleIcon className="w-5 h-5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
