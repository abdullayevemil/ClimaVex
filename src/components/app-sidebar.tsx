"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FileText,
  Gauge,
  Landmark,
  MapPinned,
  Sprout,
} from "lucide-react";
import { useI18n } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname();
  const { dictionary } = useI18n();
  const links = [
    { href: "/", label: dictionary.nav.dashboard, icon: Gauge },
    { href: "/regions", label: dictionary.nav.regions, icon: MapPinned },
    { href: "/portfolio", label: dictionary.nav.portfolio, icon: Landmark },
    { href: "/reports", label: dictionary.nav.reports, icon: FileText },
  ];

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-slate-950 text-slate-100 lg:block">
      <div className="flex h-full min-h-[calc(100vh-4rem)] flex-col justify-between p-4">
        <nav className="space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const active =
              pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-900 hover:text-white",
                  active && "bg-teal-500/15 text-white ring-1 ring-teal-400/30",
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Sprout className="h-4 w-4 text-emerald-400" />
            {dictionary.sidebar.engineTitle}
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            {dictionary.sidebar.engineBody}
          </p>
        </div>
      </div>
    </aside>
  );
}
