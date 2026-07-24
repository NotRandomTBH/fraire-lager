"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${className}`}
    >
      {pending ? "Wird gespeichert…" : children}
    </button>
  );
}
