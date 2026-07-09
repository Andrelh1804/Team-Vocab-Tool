import React from "react";
import { useGetExecutiveDashboard } from "@workspace/api-client-react";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  HardDrive,
  Ticket,
  TrendingUp,
  ShieldAlert
} from "lucide-react";
import { 
  Area, 
  AreaChart, 
  Bar, 
  BarChart, 
  CartesianGrid, 
  Cell, 
  Pie, 
  PieChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis 
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ExecutiveDashboard() {
  const { data: dashboard, isLoading } = useGetExecutiveDashboard();

  if (isLoading || !dashboard) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Executive Overview</h1>
            <p className="text-muted-foreground mt-1">Platform health and operational metrics</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 bg-card rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-[400px] bg-card rounded-xl" />
          <Skeleton className="h-[400px] bg-card rounded-xl" />
        </div>
      </div>
    );
  }

  const {
    totalDevices,
    onlineDevices,
    offlineDevices,
    openTickets,
    resolvedThisWeek,
    criticalAlerts,
    uptimePercent,
    slaCompliancePercent,
    devicesByType,
    ticketsByPriority,
    weeklyTicketTrend
  } = dashboard;

  const kpis = [
    {
      title: "Platform Uptime",
      value: `${uptimePercent}%`,
      icon: Activity,
      color: "text-primary",
      desc: "Last 30 days"
    },
    {
      title: "Online Devices",
      value: `${onlineDevices} / ${totalDevices}`,
      icon: HardDrive,
      color: "text-secondary",
      desc: `${offlineDevices} offline`
    },
    {
      title: "SLA Compliance",
      value: `${slaCompliancePercent}%`,
      icon: CheckCircle2,
      color: "text-green-500",
      desc: `${resolvedThisWeek} resolved this week`
    },
    {
      title: "Critical Alerts",
      value: criticalAlerts,
      icon: ShieldAlert,
      color: "text-destructive",
      desc: "Require immediate action"
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Executive Overview</h1>
          <p className="text-muted-foreground mt-1">Platform health and operational metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <Card key={i} className="border-card-border bg-card/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                  <p className="text-3xl font-bold text-white font-mono tracking-tight">{kpi.value}</p>
                </div>
                <div className={`p-3 bg-background/50 rounded-lg ${kpi.color}`}>
                  <kpi.icon className="w-6 h-6" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4 font-mono">{kpi.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-card-border bg-card/50 backdrop-blur flex flex-col">
          <CardHeader>
            <CardTitle>Ticket Volume Trend</CardTitle>
            <CardDescription>Tickets created vs resolved over last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTicketTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="label" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-card-border bg-card/50 backdrop-blur flex flex-col">
          <CardHeader>
            <CardTitle>Devices by Type</CardTitle>
            <CardDescription>Distribution of managed assets</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={devicesByType} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  width={80}
                />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--accent))' }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                  {devicesByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || 'hsl(var(--primary))'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
