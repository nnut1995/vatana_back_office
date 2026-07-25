"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/orders", label: "Orders", icon: "▤" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-black/10 bg-black/[.02] dark:border-white/10 dark:bg-white/[.02]">
      <div className="flex h-16 items-center gap-2 border-b border-black/10 px-5 dark:border-white/10">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-foreground text-background text-sm font-bold">
          V
        </span>
        <span className="font-semibold">Vatana</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-foreground text-background"
                  : "text-foreground/70 hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-black/10 p-4 text-xs text-foreground/50 dark:border-white/10">
        Back Office v0.1
      </div>
    </aside>
  );
}
