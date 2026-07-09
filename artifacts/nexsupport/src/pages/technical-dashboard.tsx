import React from "react";
import { useGetTechnicalDashboard } from "@workspace/api-client-react";
import { 
  Activity, 
  AlertTriangle,
  Clock,
  Cpu,
  Terminal,
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export function TechnicalDashboard() {
  const { data: dashboard, isLoading } = useGetTechnicalDashboard();

  if (isLoading || !dashboard) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">NOC Dashboard</h1>
          <p className="text-muted-foreground mt-1">Real-time technical metrics and diagnostics</p>
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
    scriptsRun,
    automationsTriggered,
    cpuTrend,
    memoryTrend
  } = dashboard;

  const stats = [
    {
      label: "Avg Platform Response",
      value: `${avgResponseTimeMs}ms`,
      icon: Activity,
      color: "text-primary"
    },
    {
      label: "Avg Resolution Time",
      value: `${avgResolutionTimeHours}h`,
      icon: Clock,
      color: "text-secondary"
    },
    {
      label: "Automations Triggered",
      value: automationsTriggered,
      icon: Workflow,
      color: "text-purple-500"
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">NOC Dashboard</h1>
        <p className="text-muted-foreground mt-1">Real-time technical metrics and diagnostics</p>
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
              <CardTitle>Global Resource Trends</CardTitle>
              <CardDescription>Average CPU and Memory usage across fleet</CardDescription>
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
                  name="CPU %"
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
                />
                <Line 
                  data={memoryTrend}
                  type="monotone" 
                  dataKey="value" 
                  name="Memory %"
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
            <CardTitle>Top Recurring Issues</CardTitle>
            <CardDescription>By category count</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 mt-2">
            {topIssues.map((issue, idx) => {
              const max = Math.max(...topIssues.map(i => i.count));
              const percent = (issue.count / max) * 100;
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-white">{issue.category}</span>
                    <span className="text-muted-foreground font-mono">{issue.count} cases</span>
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
            <CardTitle>Alerts by Severity</CardTitle>
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
            <CardTitle>Device Status</CardTitle>
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
