"use client";

import { changePasswordAction } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export function ChangePasswordForm() {
  return (
    <ActionForm action={changePasswordAction} resetOnSuccess className="max-w-sm space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Aktuelles Passwort</label>
        <input
          type="password"
          name="currentPassword"
          required
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Neues Passwort</label>
        <input
          type="password"
          name="newPassword"
          required
          minLength={6}
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2"
        />
      </div>
      <SubmitButton>Passwort ändern</SubmitButton>
    </ActionForm>
  );
}
