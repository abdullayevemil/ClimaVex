"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Building2, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/language-selector";
import { useI18n } from "@/components/locale-provider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function TopNavbar() {
  const pathname = usePathname();
  const { dictionary } = useI18n();
  const navLinks = [
    { href: "/", label: dictionary.nav.dashboard },
    { href: "/regions", label: dictionary.nav.regions },
    { href: "/portfolio", label: dictionary.nav.portfolio },
    { href: "/reports", label: dictionary.nav.reports },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase text-teal-700">
              ClimaVex
            </p>
            <p className="text-xs text-slate-500">
              {dictionary.topbar.productLine}
            </p>
          </div>
        </div>

        <div className="hidden min-w-80 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 lg:flex">
          <Search className="h-4 w-4" />
          <span>{dictionary.topbar.search}</span>
        </div>

        <TooltipProvider>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={dictionary.topbar.institutionProfile}
                >
                  <Building2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {dictionary.topbar.institutionProfile}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={dictionary.topbar.riskAlerts}
                >
                  <Bell className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{dictionary.topbar.riskAlerts}</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 lg:hidden">
        {navLinks.map((link) => {
          const active =
            pathname === link.href ||
            (link.href !== "/" && pathname.startsWith(link.href));

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium text-slate-600",
                active && "bg-teal-50 text-teal-800",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
