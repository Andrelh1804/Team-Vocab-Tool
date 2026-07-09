import { Router, type IRouter } from "express";
import { eq, and, ilike, type SQL } from "drizzle-orm";
import { db, ticketsTable, ticketCommentsTable } from "@workspace/db";
import {
  ListTicketsQueryParams,
  CreateTicketBody,
  GetTicketParams,
  UpdateTicketParams,
  UpdateTicketBody,
  AddTicketCommentParams,
  AddTicketCommentBody,
  ListTicketsResponse,
  CreateTicketResponse,
  GetTicketResponse,
  UpdateTicketResponse,
  GetTicketStatsResponse,
  ListTicketCommentsResponse,
  AddTicketCommentResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/tickets/stats", async (req, res): Promise<void> => {
  const tickets = await db.select().from(ticketsTable);

  const counts: Record<string, number> = { open: 0, in_progress: 0, pending: 0, resolved: 0, closed: 0 };
  const byPriority: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };

  let totalResolutionHours = 0;
  let resolvedCount = 0;
  let slaBreached = 0;

  for (const t of tickets) {
    counts[t.status] = (counts[t.status] ?? 0) + 1;
    byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1;
    if (t.resolvedAt && t.createdAt) {
      const hours = (t.resolvedAt.getTime() - t.createdAt.getTime()) / 3600000;
      totalResolutionHours += hours;
      resolvedCount++;
    }
    if (t.slaDeadline && new Date() > t.slaDeadline && t.status !== "resolved" && t.status !== "closed") {
      slaBreached++;
    }
  }

  res.json(GetTicketStatsResponse.parse({
    open: counts.open ?? 0,
    inProgress: counts.in_progress ?? 0,
    pending: counts.pending ?? 0,
    resolved: counts.resolved ?? 0,
    closed: counts.closed ?? 0,
    slaBreached,
    avgResolutionHours: resolvedCount > 0 ? totalResolutionHours / resolvedCount : 0,
    byPriority: Object.entries(byPriority).map(([name, value]) => ({ name, value })),
  }));
});

router.get("/tickets", async (req, res): Promise<void> => {
  const query = ListTicketsQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }

  const conditions: SQL[] = [];
  if (query.data.status) conditions.push(eq(ticketsTable.status, query.data.status as any));
  if (query.data.priority) conditions.push(eq(ticketsTable.priority, query.data.priority as any));
  if (query.data.assigneeId) conditions.push(eq(ticketsTable.assigneeId, query.data.assigneeId));
  if (query.data.search) conditions.push(ilike(ticketsTable.title, `%${query.data.search}%`));

  const tickets = conditions.length > 0
    ? await db.select().from(ticketsTable).where(and(...conditions))
    : await db.select().from(ticketsTable);

  res.json(ListTicketsResponse.parse(tickets));
});

router.post("/tickets", async (req, res): Promise<void> => {
  const parsed = CreateTicketBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  // Calculate SLA deadline based on priority
  const slaHours: Record<string, number> = { critical: 4, high: 8, medium: 24, low: 72 };
  const slaDeadline = new Date(Date.now() + (slaHours[parsed.data.priority] ?? 24) * 3600000);

  const [ticket] = await db.insert(ticketsTable)
    .values({ ...parsed.data as any, slaDeadline })
    .returning();
  res.status(201).json(CreateTicketResponse.parse(ticket));
});

router.get("/tickets/:id", async (req, res): Promise<void> => {
  const params = GetTicketParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, params.data.id));
  if (!ticket) { res.status(404).json({ error: "Not found" }); return; }
  res.json(GetTicketResponse.parse(ticket));
});

router.patch("/tickets/:id", async (req, res): Promise<void> => {
  const params = UpdateTicketParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateTicketBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const update: Record<string, unknown> = { ...body.data };
  if (body.data.status === "resolved" && !update.resolvedAt) {
    update.resolvedAt = new Date();
  }

  const [updated] = await db.update(ticketsTable).set(update as any).where(eq(ticketsTable.id, params.data.id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(UpdateTicketResponse.parse(updated));
});

router.get("/tickets/:id/comments", async (req, res): Promise<void> => {
  const params = AddTicketCommentParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const comments = await db.select().from(ticketCommentsTable).where(eq(ticketCommentsTable.ticketId, params.data.id));
  res.json(ListTicketCommentsResponse.parse(comments));
});

router.post("/tickets/:id/comments", async (req, res): Promise<void> => {
  const params = AddTicketCommentParams.safeParse({ id: Number(req.params.id) });
  const body = AddTicketCommentBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [comment] = await db.insert(ticketCommentsTable)
    .values({ ...body.data as any, ticketId: params.data.id })
    .returning();
  res.status(201).json(AddTicketCommentResponse.parse(comment));
});

export default router;
