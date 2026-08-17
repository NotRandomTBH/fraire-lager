"use client";

import { useId, useState } from "react";

// autoCapitalize/autoCorrect/spellCheck AUS: manche mobilen Tastaturen
// kapitalisieren oder korrigieren sonst still den ersten Buchstaben eines
// Passwortfelds, ohne dass man es an den maskierten Punkten bemerkt – das
// führt zu "falsches Passwort", obwohl man sicher ist, richtig getippt zu
// haben. Der Anzeigen-Umschalter macht das Problem zusätzlich sichtbar,
// falls die Tastatur trotzdem etwas verändert hat.
export function PasswordField({
  name,
  label,
  required,
  minLength,
  autoFocus,
}: {
  name: string;
  label: string;
  required?: boolean;
  minLength?: number;
  autoFocus?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type={visible ? "text" : "password"}
          name={name}
          required={required}
          minLength={minLength}
          autoFocus={autoFocus}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="shrink-0 rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400"
        >
          {visible ? "Verbergen" : "Anzeigen"}
        </button>
      </div>
    </div>
  );
}
