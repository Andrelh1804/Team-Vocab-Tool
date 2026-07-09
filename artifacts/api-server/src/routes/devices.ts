import { Router, type IRouter } from "express";
import { eq, and, ilike, type SQL } from "drizzle-orm";
import { db, devicesTable, notDeleted } from "@workspace/db";
import {
  ListDevicesQueryParams,
  CreateDeviceBody,
  GetDeviceParams,
  UpdateDeviceParams,
  UpdateDeviceBody,
  DeleteDeviceParams,
  GetDeviceMetricsParams,
  ListDevicesResponse,
  CreateDeviceResponse,
  GetDeviceResponse,
  UpdateDeviceResponse,
  GetDeviceStatsResponse,
  GetDeviceMetricsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/devices/stats", async (req, res): Promise<void> => {
  const devices = await db.select().from(devicesTable).where(notDeleted(devicesTable.deletedAt));

  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};

  for (const d of devices) {
    byStatus[d.status] = (byStatus[d.status] ?? 0) + 1;
    byType[d.type] = (byType[d.type] ?? 0) + 1;
  }

  const result = GetDeviceStatsResponse.parse({
    total: devices.length,
    byStatus: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
    byType: Object.entries(byType).map(([name, value]) => ({ name, value })),
  });
  res.json(result);
});

router.get("/devices", async (req, res): Promise<void> => {
  const query = ListDevicesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions: SQL[] = [notDeleted(devicesTable.deletedAt)];
  if (query.data.status) conditions.push(eq(devicesTable.status, query.data.status as any));
  if (query.data.type) conditions.push(eq(devicesTable.type, query.data.type as any));
  if (query.data.search) conditions.push(ilike(devicesTable.name, `%${query.data.search}%`));

  const devices = await db.select().from(devicesTable).where(and(...conditions));

  res.json(ListDevicesResponse.parse(devices));
});

router.post("/devices", async (req, res): Promise<void> => {
  const parsed = CreateDeviceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [device] = await db.insert(devicesTable).values(parsed.data as any).returning();
  res.status(201).json(CreateDeviceResponse.parse(device));
});

router.get("/devices/:id", async (req, res): Promise<void> => {
  const params = GetDeviceParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [device] = await db.select().from(devicesTable)
    .where(and(eq(devicesTable.id, params.data.id), notDeleted(devicesTable.deletedAt)));
  if (!device) { res.status(404).json({ error: "Not found" }); return; }
  res.json(GetDeviceResponse.parse(device));
});

router.patch("/devices/:id", async (req, res): Promise<void> => {
  const params = UpdateDeviceParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateDeviceBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [updated] = await db.update(devicesTable).set(body.data as any)
    .where(and(eq(devicesTable.id, params.data.id), notDeleted(devicesTable.deletedAt)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(UpdateDeviceResponse.parse(updated));
});

router.delete("/devices/:id", async (req, res): Promise<void> => {
  const params = DeleteDeviceParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  // Soft delete: mark deletedAt instead of removing the row, so history/audit is preserved.
  const [deleted] = await db.update(devicesTable).set({ deletedAt: new Date() })
    .where(and(eq(devicesTable.id, params.data.id), notDeleted(devicesTable.deletedAt)))
    .returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).send();
});

router.get("/devices/:id/metrics", async (req, res): Promise<void> => {
  const params = GetDeviceMetricsParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  // Generate mock metrics trend data (last 24 hours, hourly)
  const now = Date.now();
  const hours = Array.from({ length: 24 }, (_, i) => {
    const h = new Date(now - (23 - i) * 3600000);
    return `${h.getHours()}:00`;
  });

  const rand = (base: number, variance: number) =>
    Math.max(0, Math.min(100, base + (Math.random() - 0.5) * variance));

  const result = GetDeviceMetricsResponse.parse({
    deviceId: params.data.id,
    cpuHistory: hours.map((label) => ({ label, value: rand(45, 30) })),
    memoryHistory: hours.map((label) => ({ label, value: rand(62, 20) })),
    diskHistory: hours.map((label) => ({ label, value: rand(55, 10) })),
  });
  res.json(result);
});

export default router;
