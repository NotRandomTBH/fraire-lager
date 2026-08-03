"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ActionState } from "@/app/actions";

const initialState: ActionState = { ok: true, message: "" };

export function ActionForm({
  action,
  children,
  className = "",
  resetOnSuccess = false,
  onSuccess,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  onSuccess?: () => void;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && state.message) {
      if (resetOnSuccess) formRef.current?.reset();
      onSuccess?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className={className}>
      {children}
      {state.message && (
        <p
          className={`mt-2 text-sm ${
            state.ok ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
