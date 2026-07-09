import React, { useState } from "react";
import { useListTickets } from "@workspace/api-client-react";
import { Link } from "wouter";
import {
  Search,
  Filter,
  Ticket as TicketIcon,
  Clock,
  AlertCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTranslation } from "react-i18next";

const PriorityBadge = ({ priority }: { priority: string }) => {
  const { t } = useTranslation();
  switch (priority) {
    case 'critical': return <Badge variant="destructive" className="animate-pulse">{t("common.critical")}</Badge>;
    case 'high': return <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20">{t("common.high")}</Badge>;
    case 'medium': return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">{t("common.medium")}</Badge>;
    default: return <Badge variant="outline" className="bg-muted text-muted-foreground">{t("common.low")}</Badge>;
  }
};

const StatusBadge = ({ status }: { status: string }) => {
  const { t } = useTranslation();
  switch (status) {
    case 'open': return <Badge variant="outline" className="border-primary/50 text-primary">{t("tickets.open")}</Badge>;
    case 'in_progress': return <Badge variant="outline" className="bg-primary/20 text-primary border-transparent">{t("tickets.inProgress")}</Badge>;
    case 'pending': return <Badge variant="outline" className="bg-secondary/20 text-secondary border-transparent">{t("common.pending")}</Badge>;
    case 'resolved': return <Badge variant="outline" className="bg-green-500/20 text-green-500 border-transparent">{t("common.resolved")}</Badge>;
    default: return <Badge variant="outline" className="bg-muted text-muted-foreground">{t("tickets.closed")}</Badge>;
  }
};

export function TicketsList() {
  const [search, setSearch] = useState("");
  const { data: tickets, isLoading } = useListTickets({ search: search || undefined });
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "pt" ? ptBR : undefined;

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{t("tickets.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("tickets.subtitle")}</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <TicketIcon className="w-4 h-4 mr-2" />
          {t("tickets.newTicket")}
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("tickets.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-card-border"
          />
        </div>
        <Button variant="outline" className="border-card-border bg-card">
          <Filter className="w-4 h-4 mr-2" />
          {t("tickets.statusOpen")}
        </Button>
      </div>

      <div className="grid gap-3 flex-1 overflow-auto pb-6">
        {isLoading ? (
          Array(5).fill(0).map((_, i) => (
            <div key={i} className="rounded-lg border border-card-border bg-card p-4 h-24">
              <Skeleton className="h-full w-full" />
            </div>
          ))
        ) : tickets?.length === 0 ? (
          <div className="h-64 flex items-center justify-center rounded-lg border border-dashed border-card-border">
            <div className="text-center text-muted-foreground">
              <TicketIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>{t("tickets.noTickets")}</p>
            </div>
          </div>
        ) : (
          tickets?.map((ticket) => (
            <Link key={ticket.id} href={`/tickets/${ticket.id}`}>
              <div className="group rounded-lg border border-card-border bg-card p-4 hover:border-primary/50 transition-colors cursor-pointer relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-primary transition-colors" />

                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-primary">TKT-{ticket.id.toString().padStart(4, '0')}</span>
                      <h3 className="font-medium text-white group-hover:text-primary transition-colors">{ticket.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{ticket.description || t("tickets.noDescription")}</p>

                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {ticket.category}
                      </span>
                      {ticket.deviceName && (
                        <span>{t("tickets.device")} <span className="font-mono text-white/70">{ticket.deviceName}</span></span>
                      )}
                      <span>{t("tickets.reporter")} <span className="text-white/70">{ticket.reporterName}</span></span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={ticket.priority} />
                      <StatusBadge status={ticket.status} />
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground mt-2">
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      {t("tickets.created")} {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: dateLocale })}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
