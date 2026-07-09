import React from "react";
import { useListAutomations, useToggleAutomation } from "@workspace/api-client-react";
import {
  Workflow,
  Clock,
  Zap,
  AlertTriangle,
  TicketCheck,
  PowerOff,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTranslation } from "react-i18next";

const TriggerIcon = ({ trigger }: { trigger: string }) => {
  switch (trigger) {
    case 'schedule': return <Clock className="w-4 h-4 text-blue-400" />;
    case 'alert': return <AlertTriangle className="w-4 h-4 text-secondary" />;
    case 'ticket_created': return <TicketCheck className="w-4 h-4 text-purple-400" />;
    case 'device_offline': return <PowerOff className="w-4 h-4 text-destructive" />;
    default: return <Zap className="w-4 h-4 text-primary" />;
  }
};

export function Automations() {
  const { data: automations, isLoading } = useListAutomations();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "pt" ? ptBR : undefined;

  const toggleMutation = useToggleAutomation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['automations'] });
      }
    }
  });

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Workflow className="w-8 h-8 text-purple-500" />
            {t("automations.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("automations.subtitle")}</p>
        </div>
        <Button className="bg-purple-600 text-white hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          {t("automations.createRule")}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-auto pb-6">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-40 bg-card rounded-xl" />)
        ) : automations?.length === 0 ? (
          <div className="col-span-full h-64 flex items-center justify-center rounded-xl border border-dashed border-card-border">
            <p className="text-muted-foreground">{t("automations.noAutomations")}</p>
          </div>
        ) : (
          automations?.map((auto) => (
            <div key={auto.id} className={`p-5 rounded-xl border transition-colors relative overflow-hidden ${
              auto.isActive ? 'bg-card border-card-border' : 'bg-card/30 border-card-border/50 opacity-70'
            }`}>
              {auto.isActive && (
                <div className="absolute top-0 left-0 w-1 bottom-0 bg-purple-500 shadow-[0_0_10px_#a855f7]" />
              )}

              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg text-white">{auto.name}</h3>
                  <p className="text-sm text-muted-foreground">{auto.description}</p>
                </div>
                <Switch
                  checked={auto.isActive}
                  onCheckedChange={() => toggleMutation.mutate({ id: auto.id })}
                  disabled={toggleMutation.isPending}
                  className="data-[state=checked]:bg-purple-500"
                />
              </div>

              <div className="flex items-center gap-6 mt-6">
                <div className="flex items-center gap-2 text-sm bg-background px-3 py-1.5 rounded-md border border-border">
                  <TriggerIcon trigger={auto.trigger} />
                  <span className="font-mono text-muted-foreground uppercase text-xs">{auto.trigger}</span>
                </div>

                <div className="flex flex-col gap-0.5 text-xs">
                  <span className="text-muted-foreground font-mono">{t("automations.runs")} <span className="text-white">{auto.runCount}</span></span>
                  <span className="text-muted-foreground font-mono">
                    {t("automations.last")} {auto.lastRunAt ? formatDistanceToNow(new Date(auto.lastRunAt), { addSuffix: true, locale: dateLocale }) : t("automations.never")}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
