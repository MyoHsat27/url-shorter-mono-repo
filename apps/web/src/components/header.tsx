"use client";

import Link from "next/link";
import { Link2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-neutral-200/50 bg-white/80 backdrop-blur-xl dark:border-neutral-800/50 dark:bg-neutral-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 dark:bg-neutral-100">
            <Link2 className="h-5 w-5 text-neutral-50 dark:text-neutral-900" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            URLShort
          </span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
