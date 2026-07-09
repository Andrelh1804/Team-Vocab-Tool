import React from "react";
import { useParams, Link } from "wouter";
import { useGetDevice, useGetDeviceMetrics, useDiagnoseDevice } from "@workspace/api-client-react";
import {
  Activity,
  ArrowLeft,
  Bot,
  Cpu,
  HardDrive,
  MemoryStick,
  TerminalSquare,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

export function DeviceDetail() {
  const { id } = useParams();
  const deviceId = parseInt(id || "0", 10);
  const { toast } = useToast();
  const { t } = useTranslation();

  const { data: device, isLoading: isDeviceLoading } = useGetDevice(deviceId, {
    query: { enabled: !!deviceId, queryKey: ['device', deviceId] }
  });

  const { data: metrics, isLoading: isMetricsLoading } = useGetDeviceMetrics(deviceId, {
    query: { enabled: !!deviceId, queryKey: ['deviceMetrics', deviceId] }
  });

  const diagnoseDevice = useDiagnoseDevice({
    mutation: {
      onSuccess: (result) => {
        toast({
          title: t("devices.diagnosisComplete"),
          description: result.summary,
        });
      },
      onError: () => {
        toast({
          title: t("devices.diagnosisFailed"),
          description: t("devices.diagnosisError"),
          variant: "destructive"
        });
      }
    }
  });

  if (isDeviceLoading || !device) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 bg-card" />
        <Skeleton className="h-40 w-full bg-card rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-[300px] w-full bg-card rounded-xl" />
          <Skeleton className="h-[300px] w-full bg-card rounded-xl" />
        </div>
      </div>
    );
  }

  const handleDiagnosis = () => {
    diagnoseDevice.mutate({ deviceId });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0 w-full">
          <Link href="/devices">
            <Button variant="ghost" size="icon" className="rounded-full shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex flex-wrap items-center gap-3">
              <span className="break-words">{device.hostname || device.name}</span>
              {device.status === 'online' ? (
                <Badge className="bg-green-500/10 text-green-500 border-green-500/20">{t("common.online")}</Badge>
              ) : device.status === 'warning' ? (
                <Badge className="bg-secondary/10 text-secondary border-secondary/20">{t("common.warning")}</Badge>
              ) : (
                <Badge variant="destructive">{t("common.offline")}</Badge>
              )}
            </h1>
            <p className="text-muted-foreground font-mono text-sm mt-1 break-all">{device.ipAddress} • {device.macAddress}</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/10 flex-1 sm:flex-none">
            <TerminalSquare className="w-4 h-4 mr-2" />
            {t("devices.remoteShell")}
          </Button>
          <Button
            onClick={handleDiagnosis}
            disabled={diagnoseDevice.isPending}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-[0_0_15px_rgba(255,176,0,0.3)] flex-1 sm:flex-none"
          >
            {diagnoseDevice.isPending ? (
              <Activity className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Bot className="w-4 h-4 mr-2" />
            )}
            {t("devices.aiDiagnose")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-card-border bg-card/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg text-primary">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("devices.cpuUsage")}</p>
              <p className="text-2xl font-mono text-white font-bold">{device.cpuUsage ?? 0}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-card-border bg-card/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-secondary/10 rounded-lg text-secondary">
              <MemoryStick className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("devices.memory")}</p>
              <p className="text-2xl font-mono text-white font-bold">{device.memoryUsage ?? 0}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-card-border bg-card/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-lg text-purple-500">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("devices.diskSpace")}</p>
              <p className="text-2xl font-mono text-white font-bold">{device.diskUsage ?? 0}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-card-border bg-card/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-accent rounded-lg text-muted-foreground">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("devices.lastSeen")}</p>
              <p className="text-sm font-mono text-white font-bold mt-1">
                {device.lastSeen ? format(new Date(device.lastSeen), "HH:mm:ss") : 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-card-border bg-card">
            <CardHeader>
              <CardTitle>{t("devices.performanceMetrics")}</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {isMetricsLoading || !metrics ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">{t("devices.loadingMetrics")}</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="label"
                      allowDuplicatedCategory={false}
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
                      data={metrics.cpuHistory}
                      type="monotone"
                      dataKey="value"
                      name={t("devices.cpu")}
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      data={metrics.memoryHistory}
                      type="monotone"
                      dataKey="value"
                      name={t("devices.memory")}
                      stroke="hsl(var(--secondary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-card-border bg-card">
            <CardHeader>
              <CardTitle>{t("devices.systemInformation")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2 py-2 border-b border-border/50">
                <span className="text-muted-foreground">{t("devices.os")}</span>
                <span className="sm:col-span-2 text-white font-medium break-words">{device.operatingSystem || '-'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2 py-2 border-b border-border/50">
                <span className="text-muted-foreground">{t("devices.manufacturer")}</span>
                <span className="sm:col-span-2 text-white break-words">{device.manufacturer || '-'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2 py-2 border-b border-border/50">
                <span className="text-muted-foreground">{t("devices.model")}</span>
                <span className="sm:col-span-2 text-white break-words">{device.model || '-'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2 py-2 border-b border-border/50">
                <span className="text-muted-foreground">{t("devices.serial")}</span>
                <span className="sm:col-span-2 text-white font-mono break-all">{device.serialNumber || '-'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2 py-2 border-b border-border/50">
                <span className="text-muted-foreground">{t("devices.assignedTo")}</span>
                <span className="sm:col-span-2 text-white break-words">{device.assignedUser || '-'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2 py-2">
                <span className="text-muted-foreground">{t("devices.location")}</span>
                <span className="sm:col-span-2 text-white break-words">{device.location || '-'}</span>
              </div>
            </CardContent>
          </Card>

          {diagnoseDevice.data && (
            <Card className="border-secondary/50 bg-secondary/5 shadow-[0_0_20px_rgba(255,176,0,0.05)] animate-in slide-in-from-right-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-secondary">
                  <Bot className="w-5 h-5" />
                  {t("devices.aiDiagnosis")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-white/90 leading-relaxed">{diagnoseDevice.data.summary}</p>

                {diagnoseDevice.data.issues.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("devices.identifiedIssues")}</p>
                    {diagnoseDevice.data.issues.map((issue, i) => (
                      <div key={i} className="flex gap-2 p-2 rounded-md bg-background border border-border">
                        <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-white">{issue.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{issue.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {diagnoseDevice.data.recommendations.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("devices.recommendations")}</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {diagnoseDevice.data.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm text-white/80">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
