import React, { useState } from "react";
import { useListAlerts, useGetAlertSummary, useAcknowledgeAlert, useResolveAlert } from "@workspace/api-client-react";
import {
  AlertTriangle,
  CheckCircle2,
  BellRing,
  Info,
  ShieldAlert,
  ServerCrash
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTranslation } from "react-i18next";

const SeverityIcon = ({ severity }: { severity: string }) => {
  switch (severity) {
    case 'critical': return <ServerCrash className="w-5 h-5 text-destructive animate-pulse" />;
    case 'high': return <ShieldAlert className="w-5 h-5 text-secondary" />;
    case 'medium': return <AlertTriangle className="w-5 h-5 text-blue-500" />;
    default: return <Info className="w-5 h-5 text-muted-foreground" />;
  }
};

const SeverityBadge = ({ severity }: { severity: string }) => {
  const { t } = useTranslation();
  switch (severity) {
    case 'critical': return <Badge variant="destructive" className="bg-destructive/20 text-destructive hover:bg-destructive/30 border-none">{t("common.critical")}</Badge>;
    case 'high': return <Badge variant="outline" className="bg-secondary/20 text-secondary hover:bg-secondary/30 border-none">{t("common.high")}</Badge>;
    case 'medium': return <Badge variant="outline" className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 border-none">{t("common.medium")}</Badge>;
    default: return <Badge variant="outline" className="bg-muted text-muted-foreground border-none">{t("common.info")}</Badge>;
  }
};

export function Alerts() {
  const [filter, setFilter] = useState<'active' | 'acknowledged' | 'resolved'>('active');
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "pt" ? ptBR : undefined;

  const { data: summary, isLoading: isSummaryLoading } = useGetAlertSummary();
  const { data: alerts, isLoading: isAlertsLoading } = useListAlerts({ status: filter });

  const acknowledgeAlert = useAcknowledgeAlert({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['alerts'] });
        queryClient.invalidateQueries({ queryKey: ['alertSummary'] });
      }
    }
  });

  const resolveAlert = useResolveAlert({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['alerts'] });
        queryClient.invalidateQueries({ queryKey: ['alertSummary'] });
      }
    }
  });

  const filterLabel = {
    active: t("alerts.active"),
    acknowledged: t("alerts.acknowledged"),
    resolved: t("alerts.resolved"),
  }[filter];

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">{t("alerts.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("alerts.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isSummaryLoading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 bg-card rounded-xl" />)
        ) : summary ? (
          <>
            <Card className="border-destructive/50 bg-destructive/5 cursor-pointer hover:bg-destructive/10 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-destructive">{t("common.critical")}</p>
                  <p className="text-3xl font-bold text-destructive font-mono mt-1">{summary.critical}</p>
                </div>
                <ServerCrash className="w-8 h-8 text-destructive/50" />
              </CardContent>
            </Card>
            <Card className="border-secondary/50 bg-secondary/5 cursor-pointer hover:bg-secondary/10 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary">{t("common.high")}</p>
                  <p className="text-3xl font-bold text-secondary font-mono mt-1">{summary.high}</p>
                </div>
                <ShieldAlert className="w-8 h-8 text-secondary/50" />
              </CardContent>
            </Card>
            <Card className="border-blue-500/50 bg-blue-500/5 cursor-pointer hover:bg-blue-500/10 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-500">{t("common.medium")}</p>
                  <p className="text-3xl font-bold text-blue-500 font-mono mt-1">{summary.medium}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-blue-500/50" />
              </CardContent>
            </Card>
            <Card className="border-card-border bg-card cursor-pointer hover:bg-accent/50 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t("alerts.totalActive")}</p>
                  <p className="text-3xl font-bold text-white font-mono mt-1">{summary.active}</p>
                </div>
                <BellRing className="w-8 h-8 text-muted-foreground/50" />
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <Button
          variant={filter === 'active' ? 'default' : 'ghost'}
          className={filter === 'active' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}
          onClick={() => setFilter('active')}
        >
          {t("alerts.active")}
        </Button>
        <Button
          variant={filter === 'acknowledged' ? 'default' : 'ghost'}
          className={filter === 'acknowledged' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}
          onClick={() => setFilter('acknowledged')}
        >
          {t("alerts.acknowledged")}
        </Button>
        <Button
          variant={filter === 'resolved' ? 'default' : 'ghost'}
          className={filter === 'resolved' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}
          onClick={() => setFilter('resolved')}
        >
          {t("alerts.resolved")}
        </Button>
      </div>

      <div className="space-y-3 flex-1 overflow-auto pb-6">
        {isAlertsLoading ? (
          Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full bg-card rounded-lg" />)
        ) : alerts?.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground italic border border-dashed border-border rounded-lg">
            {t("alerts.noAlerts", { filter: filterLabel })}
          </div>
        ) : (
          alerts?.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-4 p-4 rounded-lg border bg-card transition-colors ${
                alert.severity === 'critical' && alert.status === 'active'
                  ? 'border-destructive/50 bg-destructive/5'
                  : 'border-card-border hover:border-primary/30'
              }`}
            >
              <div className="mt-1">
                <SeverityIcon severity={alert.severity} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-white truncate">{alert.title}</h3>
                  <SeverityBadge severity={alert.severity} />
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{alert.message}</p>
                <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                  <span>{t("alerts.source")} {alert.source}</span>
                  {alert.deviceName && <span>Device: <span className="text-white/70">{alert.deviceName}</span></span>}
                  <span>{formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true, locale: dateLocale })}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                {alert.status === 'active' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-card-border hover:border-primary text-xs"
                    onClick={() => acknowledgeAlert.mutate({ id: alert.id })}
                    disabled={acknowledgeAlert.isPending}
                  >
                    {t("alerts.acknowledge")}
                  </Button>
                )}
                {alert.status !== 'resolved' && (
                  <Button
                    size="sm"
                    className="h-8 bg-green-500/20 text-green-500 hover:bg-green-500/30 text-xs"
                    onClick={() => resolveAlert.mutate({ id: alert.id })}
                    disabled={resolveAlert.isPending}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    {t("alerts.resolve")}
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
