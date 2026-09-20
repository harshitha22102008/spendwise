/**
 * Demo seed — sample account with categories + transactions for local demos.
 *
 * Credentials (also in README):
 *   email:    demo@spendwise.local
 *   password: demo1234
 *
 * Re-running replaces the demo user's categories + transactions so charts stay consistent.
 */
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@spendwise.local";
const DEMO_PASSWORD = "demo1234";
const DEMO_NAME = "Demo Student";
const SALT_ROUNDS = 10;

function utcDay(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

/** Calendar date N days ago (UTC midnight), for a populated current-month chart. */
function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { passwordHash, name: DEMO_NAME },
    create: {
      email: DEMO_EMAIL,
      passwordHash,
      name: DEMO_NAME,
    },
  });

  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.category.deleteMany({ where: { userId: user.id } });

  const stipend = await prisma.category.create({
    data: { name: "Stipend", kind: "income", color: "#1d4ed8", userId: user.id },
  });
  const freelance = await prisma.category.create({
    data: {
      name: "Freelance",
      kind: "income",
      color: "#0369a1",
      userId: user.id,
    },
  });
  const groceries = await prisma.category.create({
    data: {
      name: "Groceries",
      kind: "expense",
      color: "#1a6b58",
      userId: user.id,
    },
  });
  const transit = await prisma.category.create({
    data: {
      name: "Transit",
      kind: "expense",
      color: "#4b5563",
      userId: user.id,
    },
  });
  const coffee = await prisma.category.create({
    data: {
      name: "Coffee",
      kind: "expense",
      color: "#047857",
      userId: user.id,
    },
  });

  const txs: Array<{
    categoryId: string;
    type: "income" | "expense";
    amount: number;
    date: string;
    note?: string;
  }> = [
    {
      categoryId: stipend.id,
      type: "income",
      amount: 8000,
      date: daysAgo(25),
      note: "Monthly stipend",
    },
    {
      categoryId: freelance.id,
      type: "income",
      amount: 2500,
      date: daysAgo(18),
      note: "Logo gig",
    },
    {
      categoryId: groceries.id,
      type: "expense",
      amount: 620,
      date: daysAgo(22),
      note: "Weekly shop",
    },
    {
      categoryId: transit.id,
      type: "expense",
      amount: 150,
      date: daysAgo(20),
    },
    {
      categoryId: coffee.id,
      type: "expense",
      amount: 80,
      date: daysAgo(19),
    },
    {
      categoryId: groceries.id,
      type: "expense",
      amount: 540,
      date: daysAgo(15),
    },
    {
      categoryId: transit.id,
      type: "expense",
      amount: 120,
      date: daysAgo(12),
    },
    {
      categoryId: coffee.id,
      type: "expense",
      amount: 95,
      date: daysAgo(10),
      note: "Study cafe",
    },
    {
      categoryId: groceries.id,
      type: "expense",
      amount: 710,
      date: daysAgo(8),
    },
    {
      categoryId: freelance.id,
      type: "income",
      amount: 1200,
      date: daysAgo(6),
      note: "Tutoring",
    },
    {
      categoryId: transit.id,
      type: "expense",
      amount: 90,
      date: daysAgo(5),
    },
    {
      categoryId: coffee.id,
      type: "expense",
      amount: 70,
      date: daysAgo(3),
    },
    {
      categoryId: groceries.id,
      type: "expense",
      amount: 480,
      date: daysAgo(1),
      note: "Snacks + fruit",
    },
    {
      categoryId: coffee.id,
      type: "expense",
      amount: 65,
      date: daysAgo(0),
    },
  ];

  await prisma.transaction.createMany({
    data: txs.map((t) => ({
      userId: user.id,
      categoryId: t.categoryId,
      type: t.type,
      amount: t.amount,
      date: utcDay(t.date),
      note: t.note ?? null,
    })),
  });

  console.log("SpendWise seed complete.");
  console.log(`  Demo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(
    `  Created ${txs.length} transactions across 5 categories for ${DEMO_NAME}.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
