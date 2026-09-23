import { PrismaClient } from "@prisma/client";
import type { Asset, Priority, Technician, WorkOrder, WorkOrderState } from "@equipment-hub/contract";

export interface WorkOrderFilters {
  state?: WorkOrderState;
  priority?: Priority;
}

/**
 * A user row as stored, including the password hash. Never send this over the
 * wire; convert it with `toPublicUser` from domain/auth first.
 */
export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: string;
  technicianId: string | null;
}

export interface Repository {
  listAssets(): Asset[] | Promise<Asset[]>;
  listTechnicians(): Technician[] | Promise<Technician[]>;
  listWorkOrders(filters?: WorkOrderFilters): WorkOrder[] | Promise<WorkOrder[]>;
  getWorkOrder(id: string): WorkOrder | undefined | Promise<WorkOrder | undefined>;
  saveWorkOrder(updated: WorkOrder): void | Promise<void>;
  assetExists(id: string): boolean | Promise<boolean>;
  technicianExists(id: string): boolean | Promise<boolean>;
  references(): string[] | Promise<string[]>;
  findUserByEmail(email: string): UserRecord | undefined | Promise<UserRecord | undefined>;
  findUserById(id: string): UserRecord | undefined | Promise<UserRecord | undefined>;
}

function toWorkOrder(row: {
  id: string;
  reference: string;
  assetId: string;
  title: string;
  description: string;
  priority: string;
  state: string;
  technicianId: string | null;
  reportedAt: Date;
  updatedAt: Date;
}): WorkOrder {
  return {
    id: row.id,
    reference: row.reference,
    assetId: row.assetId,
    title: row.title,
    description: row.description,
    priority: row.priority as Priority,
    state: row.state as WorkOrderState,
    technicianId: row.technicianId,
    reportedAt: row.reportedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function createRepository(prisma: PrismaClient = new PrismaClient()): Repository {
  return {
    async listAssets() {
      const assets = await prisma.asset.findMany();
      return assets;
    },

    async listTechnicians() {
      const technicians = await prisma.technician.findMany();
      return technicians;
    },

    async listWorkOrders(filters) {
      const rows = await prisma.workOrder.findMany({
        where: {
          ...(filters?.state ? { state: filters.state } : {}),
          ...(filters?.priority ? { priority: filters.priority } : {}),
        },
      });

      return rows.map(toWorkOrder);
    },

    async getWorkOrder(id) {
      const row = await prisma.workOrder.findUnique({ where: { id } });
      return row ? toWorkOrder(row) : undefined;
    },

    async saveWorkOrder(updated) {
      await prisma.workOrder.upsert({
        where: { id: updated.id },
        create: {
          id: updated.id,
          reference: updated.reference,
          assetId: updated.assetId,
          title: updated.title,
          description: updated.description,
          priority: updated.priority,
          state: updated.state,
          technicianId: updated.technicianId,
          reportedAt: new Date(updated.reportedAt),
          updatedAt: new Date(updated.updatedAt),
        },
        update: {
          title: updated.title,
          description: updated.description,
          priority: updated.priority,
          state: updated.state,
          technicianId: updated.technicianId,
          updatedAt: new Date(updated.updatedAt),
        },
      });
    },

    async assetExists(id) {
      const asset = await prisma.asset.findUnique({ where: { id } });
      return asset !== null;
    },

    async technicianExists(id) {
      const technician = await prisma.technician.findUnique({ where: { id } });
      return technician !== null;
    },

    async references() {
      const rows = await prisma.workOrder.findMany({ select: { reference: true } });
      return rows.map((row) => row.reference);
    },

    async findUserByEmail(email) {
      const user = await prisma.user.findUnique({ where: { email } });
      return user ?? undefined;
    },

    async findUserById(id) {
      const user = await prisma.user.findUnique({ where: { id } });
      return user ?? undefined;
    },
  };
}
