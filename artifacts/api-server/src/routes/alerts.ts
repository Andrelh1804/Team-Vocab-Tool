import { Router, type IRouter } from "express";
import { eq, and, ilike, type SQL } from "drizzle-orm";
import { db, alertsTable, notDeleted } from "@workspace/db";
import {
  ListAlertsQueryParams,
  CreateAlertBody,
  AcknowledgeAlertParams,
  ResolveAlertParams,
  ListAlertsResponse,
  CreateAlertResponse,
  AcknowledgeAlertResponse,
  ResolveAlertResponse,
  GetAlertSummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/alerts/summary", async (req, res): Promise<void> => {
  const alerts = await db.select().from(alertsTable)
    .where(and(eq(alertsTable.status, "active"), notDeleted(alertsTable.deletedAt)));
  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const a of alerts) counts[a.severity] = (counts[a.severity] ?? 0) + 1;

  res.json(GetAlertSummaryResponse.parse({
    total: alerts.length,
    active: alerts.length,
    critical: counts.critical ?? 0,
    high: counts.high ?? 0,
    medium: counts.medium ?? 0,
    low: counts.low ?? 0,
  }));
});

router.get("/alerts", async (req, res): Promise<void> => {
  const query = ListAlertsQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }

  const conditions: SQL[] = [notDeleted(alertsTable.deletedAt)];
  if (query.data.severity) conditions.push(eq(alertsTable.severity, query.data.severity as any));
  if (query.data.status) conditions.push(eq(alertsTable.status, query.data.status as any));
  if (query.data.deviceId) conditions.push(eq(alertsTable.deviceId, query.data.deviceId));
  // alerts has no search param in OpenAPI spec — filtering handled by other params

  const alerts = await db.select().from(alertsTable).where(and(...conditions));

  res.json(ListAlertsResponse.parse(alerts));
});

router.post("/alerts", async (req, res): Promise<void> => {
  const parsed = CreateAlertBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [alert] = await db.insert(alertsTable).values(parsed.data as any).returning();
  res.status(201).json(CreateAlertResponse.parse(alert));
});

router.post("/alerts/:id/acknowledge", async (req, res): Promise<void> => {
  const params = AcknowledgeAlertParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [updated] = await db.update(alertsTable)
    .set({ status: "acknowledged", acknowledgedAt: new Date() })
    .where(and(eq(alertsTable.id, params.data.id), notDeleted(alertsTable.deletedAt)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(AcknowledgeAlertResponse.parse(updated));
});

router.post("/alerts/:id/resolve", async (req, res): Promise<void> => {
  const params = ResolveAlertParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [updated] = await db.update(alertsTable)
    .set({ status: "resolved", resolvedAt: new Date() })
    .where(and(eq(alertsTable.id, params.data.id), notDeleted(alertsTable.deletedAt)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(ResolveAlertResponse.parse(updated));
});

export default router;
