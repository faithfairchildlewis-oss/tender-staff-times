import { Link } from "@tanstack/react-router";
import { Home } from "lucide-react";
import type { ReactNode } from "react";

type PageBannerProps = {
  title: ReactNode;
  subline?: ReactNode;
  rightSlot?: ReactNode;
  children?: ReactNode;
};

/**
 * Shared top banner used across pages so styling stays in sync.
 * Renders a green header with a Home pill, centered title/subline,
 * an optional right-side slot, and optional content below (e.g. nav row).
 */
export function PageBanner({ title, subline, rightSlot, children }: PageBannerProps) {
  return (
    <header className="bg-primary text-primary-foreground px-5 pt-8 pb-7 shadow-md rounded-b-3xl">
      <div className="relative flex items-center justify-between mb-2 min-h-11">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm min-h-11 px-3 rounded-lg bg-primary-foreground/15"
        >
          <Home className="w-4 h-4" /> Home
        </Link>
        <div className="absolute left-1/2 -translate-x-1/2 text-center">
          <h1 className="text-xl font-bold leading-none">{title}</h1>
          {subline ? (
            <p className="text-xs opacity-90 leading-tight mt-0">{subline}</p>
          ) : null}
        </div>
        {rightSlot ?? <div aria-hidden className="min-h-11" />}
      </div>
      {children}
    </header>
  );
}