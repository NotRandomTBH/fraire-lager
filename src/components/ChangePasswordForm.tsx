"use client";

import { changePasswordAction } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { PasswordField } from "@/components/PasswordField";
import { SubmitButton } from "@/components/SubmitButton";

export function ChangePasswordForm() {
  return (
    <ActionForm action={changePasswordAction} resetOnSuccess className="max-w-sm space-y-4">
      <PasswordField name="currentPassword" label="Aktuelles Passwort" required />
      <PasswordField name="newPassword" label="Neues Passwort" required minLength={6} />
      <SubmitButton>Passwort ändern</SubmitButton>
    </ActionForm>
  );
}
