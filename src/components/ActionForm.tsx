"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ActionState } from "@/app/actions";

const initialState: ActionState = { ok: true, message: "" };

export function ActionForm({
  action,
  children,
  className = "",
  resetOnSuccess = false,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state.ok && state.message) {
      formRef.current?.reset();
    }
  }, [state, resetOnSuccess]);

  return (
    <form ref={formRef} action={formAction} className={className}>
      {children}
      {state.message && (
        <p
          className={`mt-2 text-sm ${
            state.ok ? "text-green-700" : "text-red-700"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
