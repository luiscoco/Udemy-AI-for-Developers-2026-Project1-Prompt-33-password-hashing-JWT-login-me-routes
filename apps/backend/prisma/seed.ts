import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import type { Asset, Technician, WorkOrder } from "@equipment-hub/contract";

const currentDir = dirname(fileURLToPath(import.meta.url));
const dataDir = join(currentDir, "../../../data");

function loadJson<T>(fileName: string): T {
  const raw = readFileSync(join(dataDir, fileName), "utf-8");
  return JSON.parse(raw) as T;
}

const SEED_USERS = [
  { email: "admin@equipment-hub.test", password: "Admin!2345", name: "Ana Admin", role: "admin", technicianId: null as string | null },
  { email: "supervisor@equipment-hub.test", password: "Super!2345", name: "Sam Supervisor", role: "supervisor", technicianId: null as string | null },
  { email: "elena.vasquez@equipment-hub.test", password: "Tech!2345", name: "Elena Vasquez", role: "technician", technicianId: "22222222-2222-4222-8222-222222222201" },
  { email: "marcus.chen@equipment-hub.test", password: "Tech!2345", name: "Marcus Chen", role: "technician", technicianId: "22222222-2222-4222-8222-222222222202" },
];

async function main() {
  const prisma = new PrismaClient();

  const assets = loadJson<Asset[]>("assets.json");
  const technicians = loadJson<Technician[]>("technicians.json");
  const workOrders = loadJson<WorkOrder[]>("work-orders.json");

  await prisma.user.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.technician.deleteMany();
  await prisma.asset.deleteMany();

  for (const asset of assets) {
    await prisma.asset.create({ data: asset });
  }

  for (const technician of technicians) {
    await prisma.technician.create({ data: technician });
  }

  for (const workOrder of workOrders) {
    await prisma.workOrder.create({
      data: {
        id: workOrder.id,
        reference: workOrder.reference,
        assetId: workOrder.assetId,
        title: workOrder.title,
        description: workOrder.description,
        priority: workOrder.priority,
        state: workOrder.state,
        technicianId: workOrder.technicianId,
        reportedAt: new Date(workOrder.reportedAt),
        updatedAt: new Date(workOrder.updatedAt),
      },
    });
  }

  for (const user of SEED_USERS) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await prisma.user.create({
      data: {
        id: randomUUID(),
        email: user.email,
        passwordHash,
        name: user.name,
        role: user.role,
        technicianId: user.technicianId,
      },
    });
  }

  console.log(
    `Seeded ${assets.length} assets, ${technicians.length} technicians, ${workOrders.length} work orders, ${SEED_USERS.length} users.`,
  );

  console.log("\nSeed login credentials:");
  for (const user of SEED_USERS) {
    console.log(`  ${user.role.padEnd(11)} ${user.email}  /  ${user.password}`);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
