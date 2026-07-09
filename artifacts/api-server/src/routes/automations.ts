import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, automationsTable, notDeleted } from "@workspace/db";
import {
  CreateAutomationBody,
  GetAutomationParams,
  UpdateAutomationParams,
  UpdateAutomationBody,
  DeleteAutomationParams,
  ToggleAutomationParams,
  ListAutomationsResponse,
  CreateAutomationResponse,
  GetAutomationResponse,
  UpdateAutomationResponse,
  ToggleAutomationResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapAutomation(a: typeof automationsTable.$inferSelect) {
  return { ...a, actions: a.actions ?? [], description: a.description ?? null, lastRunAt: a.lastRunAt ?? null };
}

router.get("/automations", async (req, res): Promise<void> => {
  const automations = await db.select().from(automationsTable).where(notDeleted(automationsTable.deletedAt));
  res.json(ListAutomationsResponse.parse(automations.map(mapAutomation)));
});

router.post("/automations", async (req, res): Promise<void> => {
  const parsed = CreateAutomationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [automation] = await db.insert(automationsTable).values(parsed.data as any).returning();
  res.status(201).json(CreateAutomationResponse.parse(mapAutomation(automation)));
});

router.get("/automations/:id", async (req, res): Promise<void> => {
  const params = GetAutomationParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [automation] = await db.select().from(automationsTable)
    .where(and(eq(automationsTable.id, params.data.id), notDeleted(automationsTable.deletedAt)));
  if (!automation) { res.status(404).json({ error: "Not found" }); return; }
  res.json(GetAutomationResponse.parse(mapAutomation(automation)));
});

router.patch("/automations/:id", async (req, res): Promise<void> => {
  const params = UpdateAutomationParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateAutomationBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [updated] = await db.update(automationsTable).set(body.data as any)
    .where(and(eq(automationsTable.id, params.data.id), notDeleted(automationsTable.deletedAt)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(UpdateAutomationResponse.parse(mapAutomation(updated)));
});

router.delete("/automations/:id", async (req, res): Promise<void> => {
  const params = DeleteAutomationParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  // Soft delete: mark deletedAt instead of removing the row, so history/audit is preserved.
  const [deleted] = await db.update(automationsTable).set({ deletedAt: new Date() })
    .where(and(eq(automationsTable.id, params.data.id), notDeleted(automationsTable.deletedAt)))
    .returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).send();
});

router.post("/automations/:id/toggle", async (req, res): Promise<void> => {
  const params = ToggleAutomationParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [current] = await db.select().from(automationsTable)
    .where(and(eq(automationsTable.id, params.data.id), notDeleted(automationsTable.deletedAt)));
  if (!current) { res.status(404).json({ error: "Not found" }); return; }
  const [updated] = await db.update(automationsTable).set({ isActive: !current.isActive })
    .where(eq(automationsTable.id, params.data.id)).returning();
  res.json(ToggleAutomationResponse.parse(mapAutomation(updated)));
});

export default router;
