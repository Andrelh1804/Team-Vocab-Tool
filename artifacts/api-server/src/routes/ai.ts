import { Router, type IRouter } from "express";
import { eq, and, ilike, type SQL } from "drizzle-orm";
import { db, devicesTable, scriptsTable, activityTable, notDeleted } from "@workspace/db";
import {
  AiChatBody,
  DiagnoseDeviceParams,
  ListScriptsQueryParams,
  CreateScriptBody,
  AiChatResponse,
  DiagnoseDeviceResponse,
  ListScriptsResponse,
  CreateScriptResponse,
} from "@workspace/api-zod";
import { randomUUID } from "crypto";

const router: IRouter = Router();

// AI responses library for common IT issues
interface AiResponseEntry {
  keywords: string[];
  response: string;
  suggestions: string[];
}

const AI_RESPONSES: AiResponseEntry[] = [
  {
    keywords: ["windows", "update", "patch"],
    response: "Windows Update issues are commonly caused by corrupted update cache. Try running `net stop wuauserv`, deleting `C:\\Windows\\SoftwareDistribution`, then restarting the service. If the issue persists, use the Windows Update Troubleshooter or DISM /Online /Cleanup-Image /RestoreHealth.",
    suggestions: ["Check Windows Update logs", "Run SFC /scannow", "Use DISM repair tool"],
  },
  {
    keywords: ["cpu", "high", "slow", "performance"],
    response: "High CPU usage can be caused by runaway processes, malware, or thermal throttling. Check Task Manager for the culprit process. Common offenders include antivirus scans, Windows Search indexing, and browser extensions. Run `Get-Process | Sort-Object CPU -Descending | Select-Object -First 10` in PowerShell.",
    suggestions: ["Run malware scan", "Check thermal performance", "Analyze startup programs"],
  },
  {
    keywords: ["network", "dns", "connectivity", "ping"],
    response: "Network connectivity issues often start with DNS. Run `ipconfig /flushdns` and `ipconfig /release && ipconfig /renew`. Test with `ping 8.8.8.8` vs `ping google.com` to isolate DNS vs routing. Check for duplicate IPs with `arp -a`.",
    suggestions: ["Check DHCP lease", "Test DNS resolution", "Verify gateway connectivity"],
  },
  {
    keywords: ["disk", "storage", "space", "ssd"],
    response: "Disk issues require immediate attention. Run SMART diagnostics with `Get-Disk | Get-StorageReliabilityCounter`. Check disk health in Device Manager. For space issues, use `du -sh /*` on Linux or TreeSize on Windows to identify large directories.",
    suggestions: ["Run SMART diagnostics", "Check disk errors", "Clean temp files"],
  },
  {
    keywords: ["memory", "ram", "crash", "bsod"],
    response: "Memory issues often manifest as BSODs or application crashes. Run Windows Memory Diagnostic (`mdsched.exe`) or MemTest86. Check Event Viewer for memory-related errors. BSODs are logged in `C:\\Windows\\Minidump` — analyze with WinDbg.",
    suggestions: ["Run Memory Diagnostic", "Analyze minidump files", "Check event logs"],
  },
];

router.post("/ai/chat", async (req, res): Promise<void> => {
  const parsed = AiChatBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { message, deviceId } = parsed.data;
  const lowerMsg = message.toLowerCase();

  // Find best matching response
  const found = AI_RESPONSES.find(r => r.keywords.some(k => lowerMsg.includes(k)));
  const matched: AiResponseEntry = found ?? {
    keywords: [],
    response: `I've analyzed your query about "${message}". As an IT support specialist, I recommend starting with a systematic diagnostic approach: check system logs, verify hardware health, review recent changes, and consult the knowledge base for similar past incidents. Would you like me to run an automated diagnosis on a specific device?`,
    suggestions: ["Run device diagnosis", "Check recent alerts", "Review knowledge base"],
  };

  // Get related scripts
  const scripts = await db.select().from(scriptsTable).where(notDeleted(scriptsTable.deletedAt)).limit(2);

  let contextInfo = "";
  if (deviceId) {
    const [device] = await db.select().from(devicesTable)
      .where(and(eq(devicesTable.id, deviceId), notDeleted(devicesTable.deletedAt)));
    if (device) {
      contextInfo = ` (Context: device ${device.name} at ${device.ipAddress}, status: ${device.status})`;
    }
  }

  res.json(AiChatResponse.parse({
    response: matched.response + contextInfo,
    sessionId: randomUUID(),
    suggestions: matched.suggestions,
    scripts: scripts.map(s => ({
      ...s,
      tags: s.tags ?? [],
      description: s.description ?? null,
    })),
  }));
});

router.post("/ai/diagnose/:deviceId", async (req, res): Promise<void> => {
  const params = DiagnoseDeviceParams.safeParse({ deviceId: Number(req.params.deviceId) });
  if (!params.success) { res.status(400).json({ error: "Invalid deviceId" }); return; }

  const [device] = await db.select().from(devicesTable)
    .where(and(eq(devicesTable.id, params.data.deviceId), notDeleted(devicesTable.deletedAt)));
  if (!device) { res.status(404).json({ error: "Device not found" }); return; }

  const issues = [];
  let criticality: "critical" | "high" | "medium" | "low" | "healthy" = "healthy";

  if (device.cpuUsage && device.cpuUsage > 85) {
    issues.push({ title: "Critical CPU Usage", description: `CPU at ${device.cpuUsage.toFixed(1)}%`, severity: "high" as const, category: "Performance" });
    criticality = "high";
  }
  if (device.memoryUsage && device.memoryUsage > 90) {
    issues.push({ title: "Memory Pressure", description: `RAM at ${device.memoryUsage.toFixed(1)}%`, severity: "high" as const, category: "Memory" });
    criticality = "high";
  }
  if (device.diskUsage && device.diskUsage > 95) {
    issues.push({ title: "Disk Almost Full", description: `Disk at ${device.diskUsage.toFixed(1)}%`, severity: "critical" as const, category: "Storage" });
    criticality = "critical";
  }
  if (device.status === "offline") {
    issues.push({ title: "Device Offline", description: `Last seen: ${device.lastSeen ?? "unknown"}`, severity: "critical" as const, category: "Connectivity" });
    criticality = "critical";
  }
  if (device.status === "warning") {
    issues.push({ title: "Device Warning State", description: "Device is reporting warnings", severity: "medium" as const, category: "General" });
    if (criticality === "healthy") criticality = "medium";
  }

  if (issues.length === 0) {
    issues.push({ title: "System Healthy", description: "No critical issues detected", severity: "low" as const, category: "General" });
  }

  // Log the diagnosis
  await db.insert(activityTable).values({
    type: "ai_diagnosis",
    message: `AI diagnosed ${device.name}: ${issues.length} issue(s) found`,
    entityId: device.id,
    entityName: device.name,
    severity: criticality,
  });

  const scripts = await db.select().from(scriptsTable).where(notDeleted(scriptsTable.deletedAt)).limit(3);

  res.json(DiagnoseDeviceResponse.parse({
    deviceId: device.id,
    summary: `Diagnosis of ${device.name} (${device.ipAddress}): ${issues.length} issue(s) found. Criticality: ${criticality}.`,
    issues,
    recommendations: [
      "Run full system scan",
      "Review event logs from the past 24 hours",
      "Check hardware temperatures",
      "Verify network connectivity",
    ].slice(0, issues.length + 1),
    criticality,
    scripts: scripts.map(s => ({ ...s, tags: s.tags ?? [], description: s.description ?? null })),
  }));
});

router.get("/ai/scripts", async (req, res): Promise<void> => {
  const query = ListScriptsQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }

  const scriptConditions: SQL[] = [notDeleted(scriptsTable.deletedAt)];
  if (query.data.language) scriptConditions.push(eq(scriptsTable.language, query.data.language as any));
  if (query.data.search) scriptConditions.push(ilike(scriptsTable.title, `%${query.data.search}%`));

  const scripts = await db.select().from(scriptsTable).where(and(...scriptConditions));

  res.json(ListScriptsResponse.parse(scripts.map(s => ({
    ...s,
    tags: s.tags ?? [],
    description: s.description ?? null,
  }))));
});

router.post("/ai/scripts", async (req, res): Promise<void> => {
  const parsed = CreateScriptBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [script] = await db.insert(scriptsTable).values(parsed.data as any).returning();
  res.status(201).json(CreateScriptResponse.parse({ ...script, tags: script.tags ?? [], description: script.description ?? null }));
});

export default router;
