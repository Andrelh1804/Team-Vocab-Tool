import React from "react";
import { useGetTechnicalDashboard } from "@workspace/api-client-react";
import {
  Activity,
  Clock,
  Cpu,
  Workflow
} from "lucide-react";
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";

export function TechnicalDashboard() {
  const { data: dashboard, isLoading } = useGetTechnicalDashboard();
  const { t } = useTranslation();

  if (isLoading || !dashboard) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{t("technical.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("technical.subtitle")}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 bg-card rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-[350px] lg:col-span-2 bg-card rounded-xl" />
          <Skeleton className="h-[350px] bg-card rounded-xl" />
        </div>
      </div>
    );
  }

  const {
    devicesByStatus,
    alertsBySeverity,
    topIssues,
    avgResponseTimeMs,
    avgResolutionTimeHours,
    automationsTriggered,
    cpuTrend,
    memoryTrend
  } = dashboard;

  const stats = [
    {
      label: t("technical.avgPlatformResponse"),
      value: `${avgResponseTimeMs}ms`,
      icon: Activity,
      color: "text-primary"
    },
    {
      label: t("technical.avgResolutionTime"),
      value: `${avgResolutionTimeHours}h`,
      icon: Clock,
      color: "text-secondary"
    },
    {
      label: t("technical.automationsTriggered"),
      value: automationsTriggered,
      icon: Workflow,
      color: "text-purple-500"
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">{t("technical.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("technical.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="border-card-border bg-card/50">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold text-white font-mono mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 bg-background rounded-lg ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-card-border bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle>{t("technical.globalResourceTrends")}</CardTitle>
              <CardDescription>{t("technical.globalResourceDesc")}</CardDescription>
            </div>
            <Cpu className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="h-[300px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
                  xAxisId="0"
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
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Line
                  data={cpuTrend}
                  type="monotone"
                  dataKey="value"
                  name={t("technical.cpuPercent")}
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
                />
                <Line
                  data={memoryTrend}
                  type="monotone"
                  dataKey="value"
                  name={t("technical.memoryPercent")}
                  stroke="hsl(var(--secondary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: 'hsl(var(--secondary))' }}
                />
                <Legend verticalAlign="top" height={36}/>
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-card-border bg-card/50">
          <CardHeader>
            <CardTitle>{t("technical.topRecurringIssues")}</CardTitle>
            <CardDescription>{t("technical.byCategory")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 mt-2">
            {topIssues.map((issue, idx) => {
              const max = Math.max(...topIssues.map(i => i.count));
              const percent = (issue.count / max) * 100;
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-white">{issue.category}</span>
                    <span className="text-muted-foreground font-mono">{issue.count} {t("common.cases")}</span>
                  </div>
                  <Progress value={percent} className="h-2 bg-background" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-card-border bg-card/50">
          <CardHeader>
            <CardTitle>{t("technical.alertsBySeverity")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={alertsBySeverity}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {alertsBySeverity.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || 'hsl(var(--primary))'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-card-border bg-card/50">
          <CardHeader>
            <CardTitle>{t("technical.deviceStatus")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={devicesByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {devicesByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || 'hsl(var(--primary))'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
