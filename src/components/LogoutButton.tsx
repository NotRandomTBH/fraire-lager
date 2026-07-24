"use client";

import { logoutAction } from "@/app/actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button type="submit" className="text-sm text-neutral-400 hover:text-neutral-700">
        Abmelden
      </button>
    </form>
  );
}
