"use server";

import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";

export type LoginState = { error: string | null; returnTo?: string };

// Kein redirect() hier: manche Browser (v.a. Safari) verlieren zuverlässig
// gesetzte Cookies, wenn eine Antwort GLEICHZEITIG einen Set-Cookie-Header
// UND eine Weiterleitung enthält (das Cookie wird nicht immer übernommen,
// bevor der Browser der Weiterleitung folgt) – das führte dazu, dass ein
// Login scheinbar klappte (die nächste Seite wurde ja trotzdem angezeigt),
// aber die Sitzung nie wirklich gespeichert wurde und die nächste Aktion
// sofort wieder "nicht angemeldet" meldete. Stattdessen wird hier nur das
// Ergebnis zurückgegeben; die Navigation macht der Client erst NACHDEM die
// Antwort (inkl. Cookie) beim Browser vollständig angekommen ist.
export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const name = String(formData.get("name") ?? "");
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({ where: { name } });
  if (!user) {
    return { error: "Unbekannter Name oder falsches Passwort." };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { error: "Unbekannter Name oder falsches Passwort." };
  }

  await createSession(user.id);

  const returnTo = String(formData.get("returnTo") ?? "");
  const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
  return { error: null, returnTo: safeReturnTo };
}
