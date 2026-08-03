"use client";

import { logoutAction } from "@/app/actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button type="submit" className="text-sm text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
        Abmelden
      </button>
    </form>
  );
}
