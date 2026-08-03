"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function NavDropdown({
  label,
  items,
}: {
  label: string;
  items: { href: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
      >
        {label}
        <span className="text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 min-w-[200px] rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-1 shadow-md">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
