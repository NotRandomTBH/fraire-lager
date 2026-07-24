import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { name: true },
  });

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-neutral-200 bg-white p-8">
        <div>
          <h1 className="text-xl font-semibold">Lagerverwaltung</h1>
          <p className="text-sm text-neutral-500">Bitte anmelden</p>
        </div>
        <LoginForm names={users.map((u) => u.name)} />
      </div>
    </div>
  );
}
