import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { NavDropdown } from "@/components/NavDropdown";

const LAGER_ITEMS = [
  { href: "/wareneingang/unterhosen", label: "Wareneingang Unterhosen" },
  { href: "/wareneingang/verpackung", label: "Wareneingang Verpackung" },
  { href: "/warenausgang", label: "Warenausgang" },
  { href: "/verpacken", label: "Verpacken" },
  { href: "/defekte-erfassen", label: "Defekte erfassen" },
];

const REST_NAV_ITEMS = [
  { href: "/bewegungen", label: "Bewegungen" },
  { href: "/defekte", label: "Defekte" },
  { href: "/statistik", label: "Statistik" },
  { href: "/analytics", label: "Analytics" },
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
        <div className="mx-auto max-w-5xl space-y-2 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Lagerverwaltung</span>
            <div className="flex items-center gap-3 text-sm text-neutral-500">
              <span>{user.name}</span>
              <LogoutButton />
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <Link href="/" className="text-neutral-600 hover:text-neutral-900">
              Dashboard
            </Link>
            <NavDropdown label="Lager" items={LAGER_ITEMS} />
            {REST_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-neutral-600 hover:text-neutral-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6">
        {children}
      </main>
    </>
  );
}
