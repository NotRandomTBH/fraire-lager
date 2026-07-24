import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

const SIZES = ["S", "M", "L", "XL"];
const PACK_SIZES = [1, 3, 5];
const EMPLOYEES = ["Gianluca", "Maurice", "Maxim"];
const DEFAULT_PASSWORD = "willkommen2026";

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  for (const name of EMPLOYEES) {
    await prisma.user.upsert({
      where: { name },
      update: {},
      create: { name, passwordHash },
    });
  }

  for (const [index, label] of SIZES.entries()) {
    const size = await prisma.size.upsert({
      where: { label },
      update: {},
      create: { label, order: index, reorderThreshold: 20 },
    });

    for (const packSize of PACK_SIZES) {
      await prisma.shopifyVariant.upsert({
        where: { sizeId_packSize: { sizeId: size.id, packSize } },
        update: {},
        create: {
          sizeId: size.id,
          packSize,
          shopifyVariantId: "",
          title: `Unterhose ${label} – ${packSize}er Pack`,
        },
      });
    }
  }

  await prisma.shopifyConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  console.log(
    `Seed abgeschlossen: 4 Grössen, 12 Varianten-Platzhalter, ${EMPLOYEES.length} Accounts (Start-Passwort: "${DEFAULT_PASSWORD}").`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
