"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginAction, type LoginState } from "@/app/login/actions";
import { PasswordField } from "@/components/PasswordField";
import { SubmitButton } from "@/components/SubmitButton";

const initialState: LoginState = { error: null };

export function LoginForm({ names, returnTo }: { names: string[]; returnTo?: string }) {
  const [state, formAction] = useActionState(loginAction, initialState);
  const router = useRouter();

  // Erst navigieren, NACHDEM die Antwort (inkl. Set-Cookie) beim Browser
  // angekommen ist – siehe Kommentar in login/actions.ts.
  useEffect(() => {
    if (!state.error && state.returnTo) {
      router.push(state.returnTo);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      {returnTo && returnTo !== "/" && <input type="hidden" name="returnTo" value={returnTo} />}
      <div>
        <label className="mb-1 block text-sm font-medium">Name</label>
        <select
          name="name"
          required
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2"
        >
          {names.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <PasswordField name="password" label="Passwort" required autoFocus />
      {state.error && <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>}
      <SubmitButton className="w-full">Anmelden</SubmitButton>
    </form>
  );
}
