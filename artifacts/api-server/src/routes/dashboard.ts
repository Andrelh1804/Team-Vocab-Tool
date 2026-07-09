import { Router, type IRouter } from "express";
import { db, devicesTable, ticketsTable, alertsTable, automationsTable, scriptsTable, activityTable } from "@workspace/db";
import {
  GetExecutiveDashboardResponse,
  GetTechnicalDashboardResponse,
  GetDashboardActivityResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/executive", async (req, res): Promise<void> => {
  const [devices, tickets, alerts] = await Promise.all([
    db.select().from(devicesTable),
    db.select().from(ticketsTable),
    db.select().from(alertsTable),
  ]);

  const onlineDevices = devices.filter(d => d.status === "online").length;
  const offlineDevices = devices.filter(d => d.status === "offline").length;
  const openTickets = tickets.filter(t => t.status === "open" || t.status === "in_progress").length;
  const criticalAlerts = alerts.filter(a => a.severity === "critical" && a.status === "active").length;

  // Weekly resolved count
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 3600000);
  const resolvedThisWeek = tickets.filter(t =>
    t.resolvedAt && t.resolvedAt > oneWeekAgo
  ).length;

  // Uptime estimate
  const uptimePercent = devices.length > 0
    ? ((onlineDevices / devices.length) * 100)
    : 100;

  // SLA compliance
  const resolvedTickets = tickets.filter(t => t.status === "resolved" || t.status === "closed");
  const slaCompliant = resolvedTickets.filter(t =>
    !t.slaDeadline || !t.resolvedAt || t.resolvedAt <= t.slaDeadline
  ).length;
  const slaCompliancePercent = resolvedTickets.length > 0
    ? (slaCompliant / resolvedTickets.length) * 100
    : 100;

  // Device types distribution
  const byType: Record<string, number> = {};
  for (const d of devices) byType[d.type] = (byType[d.type] ?? 0) + 1;

  // Ticket priority distribution
  const byPriority: Record<string, number> = {};
  for (const t of tickets) byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1;

  // Weekly trend (last 7 days)
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeklyTicketTrend = days.map((label, i) => {
    const dayStart = new Date(oneWeekAgo.getTime() + i * 24 * 3600000);
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600000);
    const count = tickets.filter(t => t.createdAt >= dayStart && t.createdAt < dayEnd).length;
    return { label, value: count };
  });

  res.json(GetExecutiveDashboardResponse.parse({
    totalDevices: devices.length,
    onlineDevices,
    offlineDevices,
    openTickets,
    resolvedThisWeek,
    criticalAlerts,
    uptimePercent: Math.round(uptimePercent * 10) / 10,
    slaCompliancePercent: Math.round(slaCompliancePercent * 10) / 10,
    devicesByType: Object.entries(byType).map(([name, value]) => ({ name, value })),
    ticketsByPriority: Object.entries(byPriority).map(([name, value]) => ({ name, value })),
    weeklyTicketTrend,
  }));
});

router.get("/dashboard/technical", async (req, res): Promise<void> => {
  const [devices, alerts, automations, scripts] = await Promise.all([
    db.select().from(devicesTable),
    db.select().from(alertsTable),
    db.select().from(automationsTable),
    db.select().from(scriptsTable),
  ]);

  // Device status counts
  const byStatus: Record<string, number> = {};
  for (const d of devices) byStatus[d.status] = (byStatus[d.status] ?? 0) + 1;

  // Alert severity counts
  const bySeverity: Record<string, number> = {};
  for (const a of alerts.filter(a => a.status === "active")) {
    bySeverity[a.severity] = (bySeverity[a.severity] ?? 0) + 1;
  }

  // Top issues by category
  const categories: Record<string, number> = {
    "Hardware": 0, "Software": 0, "Network": 0, "Security": 0, "Performance": 0,
  };
  for (const a of alerts) {
    if (a.source === "agent") categories["Hardware"] = (categories["Hardware"] ?? 0) + 1;
    else if (a.source === "network") categories["Network"] = (categories["Network"] ?? 0) + 1;
    else categories["Software"] = (categories["Software"] ?? 0) + 1;
  }

  // Simulate performance trends
  const hours = Array.from({ length: 12 }, (_, i) => `${(i * 2).toString().padStart(2, "0")}:00`);
  const cpuTrend = hours.map((label) => ({ label, value: Math.floor(30 + Math.random() * 40) }));
  const memoryTrend = hours.map((label) => ({ label, value: Math.floor(50 + Math.random() * 30) }));

  res.json(GetTechnicalDashboardResponse.parse({
    devicesByStatus: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
    alertsBySeverity: Object.entries(bySeverity).map(([name, value]) => ({ name, value })),
    topIssues: Object.entries(categories)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
    avgResponseTimeMs: 145,
    avgResolutionTimeHours: 4.7,
    scriptsRun: scripts.length * 3,
    automationsTriggered: automations.reduce((acc, a) => acc + a.runCount, 0),
    cpuTrend,
    memoryTrend,
  }));
});

router.get("/dashboard/activity", async (req, res): Promise<void> => {
  const events = await db.select().from(activityTable)
    .orderBy(activityTable.timestamp)
    .limit(20);

  res.json(GetDashboardActivityResponse.parse(
    events.map(e => ({
      ...e,
      entityId: e.entityId ?? null,
      entityName: e.entityName ?? null,
      severity: e.severity ?? null,
    }))
  ));
});

export default router;
