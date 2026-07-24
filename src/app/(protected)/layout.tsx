import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/wareneingang", label: "Wareneingang" },
  { href: "/verpacken", label: "Verpacken" },
  { href: "/bewegungen", label: "Bewegungen" },
  { href: "/defekte", label: "Defekte" },
  { href: "/statistik", label: "Statistik" },
  { href: "/einstellungen", label: "Einstellungen" },
];

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <>
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <span className="font-semibold">Lagerverwaltung</span>
          <nav className="flex items-center gap-4 text-sm">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-neutral-600 hover:text-neutral-900"
              >
                {item.label}
              </Link>
            ))}
            <span className="ml-2 border-l border-neutral-200 pl-4 text-neutral-500">
              {user.name}
            </span>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6">
        {children}
      </main>
    </>
  );
}
